// Firebase config — pedidos-grupo
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCWF7FqVVeZaSRG4VIJQPks4f1RIm7WbvY",
  authDomain: "pedidos-grupo-520ad.firebaseapp.com",
  projectId: "pedidos-grupo-520ad",
  storageBucket: "pedidos-grupo-520ad.firebasestorage.app",
  messagingSenderId: "535152669134",
  appId: "1:535152669134:web:0519e66c6e264b64f27b9f"
};

// Inicializa Firebase usando a CDN compat (funciona sem bundler)
var _db = null;
var _restauranteId = null;
var _syncCallback = null;
var _saveTimeout = null;

function initFirebase(restauranteId, onSync) {
  _restauranteId = restauranteId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  _syncCallback = onSync;

  // Tenta conectar — se falhar usa localStorage como fallback
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _db = firebase.firestore();

    // Escuta mudanças em tempo real
    _db.collection('estoque').doc(_restauranteId)
      .onSnapshot(function(doc) {
        if (doc.exists) {
          var data = doc.data();
          if (_syncCallback) _syncCallback(data);
        }
      }, function(err) {
        console.warn('Firebase onSnapshot erro:', err.message);
      });

    console.log('Firebase conectado:', _restauranteId);
  } catch(e) {
    console.warn('Firebase falhou, usando localStorage:', e.message);
    _db = null;
  }
}

function salvarFirebase(data) {
  if (!_db || !_restauranteId) return;
  // Debounce — salva 800ms após a última alteração
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(function() {
    data._ts = Date.now(); // timestamp para resolver conflitos
    _db.collection('estoque').doc(_restauranteId)
      .set(data, { merge: false })
      .then(function() {
        var el = document.getElementById('sync-status');
        if (el) { el.textContent = '✓ sincronizado'; el.className = 'sync-ok'; }
      })
      .catch(function(err) {
        console.warn('Erro ao salvar:', err.message);
        var el = document.getElementById('sync-status');
        if (el) { el.textContent = '⚠ erro ao sincronizar'; el.className = 'sync-err'; }
      });
  }, 800);
}

function carregarFirebase(callback) {
  if (!_db || !_restauranteId) { callback(null); return; }
  _db.collection('estoque').doc(_restauranteId)
    .get()
    .then(function(doc) {
      callback(doc.exists ? doc.data() : null);
    })
    .catch(function() { callback(null); });
}
