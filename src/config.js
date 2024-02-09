const admin = require('firebase-admin');

const serviceAccount = require('./path/to/your/serviceAccountKey.json'); // Replace with the path to your Firebase Admin SDK key file
const firebaseConfig = {
        credential: admin.credential.cert(serviceAccount),
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id.firebaseio.com", // This is the database URL
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id",
};

admin.initializeApp(firebaseConfig);
const db = admin.firestore();
const User_story = db.collection('User_story')

module.exports = User_story;
