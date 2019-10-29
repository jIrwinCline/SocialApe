const functions = require('firebase-functions');
const admin = require('firebase-admin');

const app = require("express")();
admin.initializeApp();

const {getAllScreams} = require('./handlers/screams')

const firebaseConfig = {
    apiKey: "AIzaSyAu3v6wkSPjN1z8HFc5ebK6nQG1-5qIxFo",
    authDomain: "socialastro-e714b.firebaseapp.com",
    databaseURL: "https://socialastro-e714b.firebaseio.com",
    projectId: "socialastro-e714b",
    storageBucket: "socialastro-e714b.appspot.com",
    messagingSenderId: "873071197018",
    appId: "1:873071197018:web:a2635b64e476f3345c5163",
    measurementId: "G-YY80FNEZXJ"
  };

const firebase = require('firebase')
firebase.initializeApp(firebaseConfig)

const db = admin.firestore();

// Screams routes
app.get('/screams', getAllScreams )
// put one scream
app.post('/scream', FBAuth, postOneScream);

const FBAuth = (req, res, next) => {
  let idToken;
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found')
    return res.status(403).json({ error: 'Unauthorized' })
  }

  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      return db.collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error('Error while verifying token ', err);
      return res.status(403).json(err);
    })
}



const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(email.match(regEx)) return true;
  else return false;
}

const isEmpty = (string) => {
  if(string.trim() === '') return true;
  else return false;
}

// Signup route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle

  };

  let errors = {};


  if (isEmpty(newUser.email)) {
    errors.email = 'Must not be empty'
  } else if(!isEmail(newUser.email)){
    errors.email = 'Must be valid email'
  }

  if(isEmpty(newUser.password)) errors.password = 'Must not be an empty password';
  if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
  if (isEmpty(newUser.handle))
    errors.handle = "Must not be an empty handle";

  if(Object.keys(errors).length > 0 ) return res.status(400).json(errors);

  // validate data
  let token, userId
  db.doc(`/users/${newUser.handle}`).get()
  .then(doc => {
    if(doc.exists){
      return res.status(400).json({ handle: 'this handle is already taken' });
    } else {
      return firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    }
  })
  .then(data => {
    userId = data.user.uid;
    return data.user.getIdToken();
  })
  .then(idToken => {
    token = idToken;
    const userCredentials = {
      handle: newUser.handle,
      email: newUser.email,
      createdAt:new Date().toISOString(),
      userId
    };
    return db.doc(`/users/${newUser.handle}`).set(userCredentials);
  })
  .then((data) => {
    return res.status(201).json({ token });
  })
  .catch(err => {
    console.error(err);
    if(err.code === 'auth/email-already-in-use') {
      return res.status(400).json({ email: 'Email is already in use' });
    } else {
      return res.status(500).json({ error: err.code });
    }
  })
})

app.post('/login', (req,res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  let errors = {};

  if(isEmpty(user.email)) errors.email = 'Must not be empty';
  if(isEmpty(user.password)) errors.password = "Must not be empty";

  if(Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email, user.password)
  .then(data => {
    return data.user.getIdToken();
  })
  .then(token => {
    return res.json({token});
  })
  .catch(err => {
    console.error(err);
    if(err.code === 'auth/wrong-password'){
      return res.status(403).json({ general: 'wrong credential, please try again'})
    } else return res.status(500).json({error: err.code});
  })

})

exports.api = functions.https.onRequest(app);
