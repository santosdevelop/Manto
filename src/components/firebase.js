import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Importación añadida

const firebaseConfig = {
  apiKey: "AIzaSyBER-IiBwM3_2gONxdYqV-yCs0JN3---bU",
  authDomain: "manttoga.firebaseapp.com",
  projectId: "manttoga",
  storageBucket: "manttoga.appspot.com", // Este campo ya existe en tu configuración
  messagingSenderId: "118525771296",
  appId: "1:118525771296:web:df2daf20200d25c4334645",
  measurementId: "G-34L10X96ZR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Instancia de Storage añadida

export { auth, db, storage }; // Exportación de storage añadida