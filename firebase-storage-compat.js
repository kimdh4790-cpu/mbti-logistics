// Firebase Storage Compat - REST API 기반 구현
(function(global){
  function Storage(app) {
    this._app = app;
    this._bucket = app.options.storageBucket || (app.options.projectId + '.appspot.com');
  }
  Storage.prototype.ref = function(path) {
    return new StorageRef(this, path || '');
  };

  function StorageRef(storage, path) {
    this._storage = storage;
    this._path = path;
  }
  StorageRef.prototype._getToken = function() {
    var auth = this._storage._app.auth ? this._storage._app.auth() : null;
    if (auth && auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return Promise.resolve('');
  };
  StorageRef.prototype._baseUrl = function() {
    return 'https://firebasestorage.googleapis.com/v0/b/' + this._storage._bucket + '/o';
  };
  StorageRef.prototype.putString = function(dataUrl, format, metadata) {
    var self = this;
    var base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
    var contentType = (metadata && metadata.contentType) || 'application/octet-stream';
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return self._getToken().then(function(token) {
      var headers = { 'Content-Type': contentType };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(self._baseUrl() + '?uploadType=media&name=' + encodeURIComponent(self._path), {
        method: 'POST', headers: headers, body: bytes
      });
    }).then(function(r) { return r.json(); }).then(function() {
      return { ref: self };
    });
  };
  StorageRef.prototype.getDownloadURL = function() {
    return Promise.resolve(
      this._baseUrl() + '/' + encodeURIComponent(this._path) + '?alt=media'
    );
  };
  StorageRef.prototype.delete = function() {
    var self = this;
    return self._getToken().then(function(token) {
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(self._baseUrl() + '/' + encodeURIComponent(self._path), {
        method: 'DELETE', headers: headers
      });
    });
  };

  // firebase.storage() 등록
  if (typeof firebase !== 'undefined') {
    if (!firebase.storage) {
      firebase.storage = function(app) {
        return new Storage(app || firebase.app());
      };
    }
  } else {
    global._FirebaseStorageCompat = { Storage: Storage };
  }
})(typeof window !== 'undefined' ? window : this);
