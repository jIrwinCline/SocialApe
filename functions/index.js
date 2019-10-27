const functions = require('firebase-functions');
const admin = require('firebase-admin');

const app = require("express")();
admin.initializeApp();


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


app.get('/screams', (req, res) => {
      admin
        .firestore()
        .collection("screams")
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
          let screams = [];
          data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
          });
          return res.json(screams);
        })
        .catch(err => console.error(err));
})

app.post('/scream',(req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: admin.firestore.Timestamp.fromDate(new Date().toISOString())
    };

    admin.firestore()
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully`});
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong'})
            console.error(err);
        })

});

app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle

  };
  // TODO validate data

  firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
    .then(data => {
        return res.status(201).json({ message: `user ${data.user.uid} signed up successfully`})
    })
    .catch(err => {
        console.error(err)
        return res.status(500).json({ error: err.code})
    })
})

exports.api = functions.https.onRequest(app);
