const gooex = (function () {
  const GOOEX_BUILD = '2022.04.11';
  const KeyValue = UserProperties.getProperties();

  function parseJsonString(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      Admin.printError(`Не удалось преобразовать строку JSON в объект JavaScript\n${error.stack}\n${content}`);
      return undefined;
    }
  }

  function parseJsonResponse(response) {
    let content = response.getContentText();
    if (content.length == 0) {
      return { msg: 'Пустой ответ', status: response.getResponseCode() };
    }
    return parseJsonString(content);
  }

  String.prototype.clearName = function () {
    return this.toLowerCase()
      .replace(/['`,?!@#$%^&*()+-./\\]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/ё/g, 'е')
      .trim();
  }

  function request() {
    return new RequestBuilder(Auth.AccessToken);
  }

  class RequestBuilder {
    constructor(accessToken) {
      this.withHost = this._urlSetter('host');
      this.withPath = this._urlSetter('path');
      this.withQuery = this._urlSetter('query');

      this._withMethod = this._paramSetter('method');
      this._withHeaders = this._paramSetter('headers');
      this.withBody = this._paramSetter('payload');
      this.withContentType = this._paramSetter('contentType');

      this.get = () => this._build('get')._execute();
      this.post = () => this._build('post')._execute();

      accessToken && (this._withHeaders({ Authorization: `OAuth ${accessToken}` }));
    }

    _urlSetter(key) {
      return function (value) {
        this[key] = value;
        return this;
      }
    }

    _paramSetter(key) {
      return function (value) {
        this._params = this._params || {};
        this._params[key] = value;
        return this;
      }
    }

    _build(method) {
      this._url = `${this.host || 'https://api.music.yandex.net'}${this.path}`;
      this._url += this.query ? `?${CustomUrlFetchApp.parseQuery(this.query)}` : '';
      if (this._params.hasOwnProperty('payload') && !this._params.hasOwnProperty('contentType')) {
        this
          .withContentType('application/x-www-form-urlencoded')
          .withBody(CustomUrlFetchApp.parseQuery(this._params.payload));
      }
      return this._withMethod(method);

    }

    _execute() {
      let response = CustomUrlFetchApp.fetch(this._url, this._params);
      return response && response.hasOwnProperty('result') ? response.result : response;
    }
  }

  const CustomUrlFetchApp = (function () {
    let countRequest = 0;
    return {
      fetch, fetchAll, parseQuery,
      get CountRequest() { return countRequest },
    };

    function fetch(url, params = {}) {
      params.muteHttpExceptions = true;
      return readResponse(tryFetch(url, params), url, params);
    }

    function fetchAll(requests) {
      requests.forEach((request) => (request.muteHttpExceptions = true));
      let responses = [];
      let limit = KeyValue.REQUESTS_IN_ROW || 40;
      let count = Math.ceil(requests.length / limit);
      for (let i = 0; i < count; i++) {
        let requestPack = requests.splice(0, limit);
        let responsePack = sendPack(requestPack).map((response, index) =>
          readResponse(response, requestPack[index].url, {
            headers: requestPack[index].headers,
            payload: requestPack[index].payload,
            muteHttpExceptions: requestPack[index].muteHttpExceptions,
          })
        );
        Combiner.push(responses, responsePack);
      }
      return responses;

      function sendPack(requests) {
        let raw = tryFetchAll(requests);
        if (typeof raw == 'undefined') {
          return [];
        }
        let failed = raw.reduce((failed, response, index) => {
          if (response.getResponseCode() == 429) {
            failed.requests.push(requests[index])
            failed.syncIndexes.push(index);
            let seconds = parseRetryAfter(response);
            if (failed.seconds < seconds) {
              failed.seconds = seconds;
            }
          }
          return failed;
        }, { seconds: 0, requests: [], syncIndexes: [] });

        if (failed.seconds > 0) {
          Admin.pause(failed.seconds);
          sendPack(failed.requests).forEach((response, index) => {
            let requestIndex = failed.syncIndexes[index];
            raw[requestIndex] = response;
          });
        }
        return raw;
      }

      function tryFetchAll(requests) {
        return tryCallback(() => {
          countRequest += requests.length;
          return UrlFetchApp.fetchAll(requests)
        });
      }
    }

    function readResponse(response, url, params = {}) {
      if (isSuccess(response.getResponseCode())) {
        return onSuccess();
      }
      return onError();

      function isSuccess(code) {
        return code >= 200 && code < 300;
      }

      function onSuccess() {
        let type = response.getHeaders()['Content-Type'] || '';
        if (type.includes('json')) {
          return parseJsonResponse(response) || [];
        }
        return response;
      }

      function onError() {
        let responseCode = response.getResponseCode();
        if (responseCode == 429) {
          return onRetryAfter();
        }
        writeErrorLog();
        if (responseCode >= 500) {
          return tryFetchOnce();
        }
      }

      function onRetryAfter() {
        Admin.pause(parseRetryAfter(response));
        return fetch(url, params);
      }

      function tryFetchOnce() {
        Admin.pause(2);
        response = tryFetch(url, params);
        if (isSuccess(response.getResponseCode())) {
          return onSuccess();
        }
        writeErrorLog();
      }

      function writeErrorLog() {
        Admin.printError(`Номер: ${response.getResponseCode()}\nАдрес: ${url}\nТекст ответа: ${response.getContentText().substring(0, 500)}`);
      }
    }

    function parseRetryAfter(response) {
      return 1 + (parseInt(response.getHeaders()['Retry-After']) || 2);
    }

    function tryFetch(url, params) {
      return tryCallback(() => {
        countRequest++;
        return UrlFetchApp.fetch(url, params)
      });
    }

    function tryCallback(callback, attempt = 0) {
      try {
        return callback();
      } catch (error) {
        Admin.printError('При отправке запроса произошла ошибка:\n', error.stack);
        if (attempt++ < 2) {
          Admin.pause(5);
          return tryCallback(callback, attempt);
        }
      }
    }

    function parseQuery(obj) {
      return Object.keys(obj)
        .map((k) => (typeof obj[k] != 'string' && obj[k] != undefined) || (typeof obj[k] == 'string' && obj[k].length > 0)
          ? `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`
          : ''
        ).filter(s => s.length > 0).join('&');
    }
  })()

  const Admin = (function () {
    let isInfoLvl, isErrorLvl;
    setLogLevelOnce();
    return {
      setLogLevelOnce, printInfo, printError, pause,
    };

    function setLogLevelOnce(level = 'info') {
      if (level == 'info') {
        isInfoLvl = isErrorLvl = true;
      } else if (level == 'error') {
        isInfoLvl = false;
        isErrorLvl = true;
      } else {
        isInfoLvl = isErrorLvl = false;
      }
    }

    function printInfo(...data) {
      isInfoLvl && console.info(...data);
    }

    function printError(...data) {
      isErrorLvl && console.error(...data);
    }

    function pause(seconds) {
      isInfoLvl && console.info(`Операция продолжится после паузы ${seconds}с.`);
      Utilities.sleep(seconds * 1000);
    }
  })()

  const Auth = (function () {
    const CLIENT_ID = '23cabbbdc6cd418abb4b39c32c41195d';
    const CLIENT_SECRET = '53bc75238f0c4d08a118e51fe9203300';
    const X_TOKEN_CLIENT_ID = 'c0ebe342af7d48fbbbfcf2d2eedb8f9e';
    const X_TOKEN_CLIENT_SECRET = 'ad0a908f0aa341a182a37ecd75bc319e';
    const PASSPORT_URL = 'https://mobileproxy.passport.yandex.net';
    let _passport = KeyValue.yandex ? JSON.parse(KeyValue.yandex) : {};
    return {
      get AccessToken() { return _passport.access_token },
      get UserId() { return _passport.uid },

      generateTokenByCredentials(login, password) {
        this.reset();
        let trackId = startAuth(login).track_id;
        let xToken = sendAuthPassword(trackId, password).x_token;
        let passport = generateBearer(xToken);
        set(passport);
      },

      reset() {
        UserProperties.deleteProperty('yandex');
        bearer = {};
      }
    };

    function set(passport) {
      passport.date = new Date().toISOString();
      UserProperties.setProperty('yandex', JSON.stringify(passport));
      _passport = passport;
    }

    function startAuth(login) {
      return request()
        .withHost(PASSPORT_URL)
        .withPath('/2/bundle/mobile/start')
        .withBody({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          login: login,
          x_token_client_id: X_TOKEN_CLIENT_ID,
          x_token_client_secret: X_TOKEN_CLIENT_SECRET,
          display_language: 'ru',
        }).post();
    }

    function sendAuthPassword(trackId, password) {
      return request()
        .withHost(PASSPORT_URL)
        .withPath('/1/bundle/mobile/auth/password')
        .withBody({ track_id: trackId, password: password, })
        .post();
    }

    function generateBearer(xToken) {
      return request()
        .withHost(PASSPORT_URL)
        .withPath(`/1/token`)
        .withQuery({
          app_id: 'ru.yandex.mobile.music',
          app_version_name: '5.18',
          app_platform: 'iPad'
        }).withBody({
          access_token: xToken,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'x-token',
        }).post();
    }
  })()

  const Cache = (function () {
    const ROOT_FOLDER = getFolder(DriveApp, 'gooex data', true);
    const USER_FOLDER = Auth.UserId ? getFolder(ROOT_FOLDER, Auth.UserId, true) : ROOT_FOLDER;
    const Storage = (function () {
      let storage = {};
      return {
        getFile: (filepath) => get(filepath, 'file'),
        setFile: (filepath, file) => set(filepath, 'file', file),
        getContent: (filepath) => get(filepath, 'content'),
        setContent: (filepath, content) => set(filepath, 'content', content),
      }

      function get(rootKey, valueKey) {
        return storage[rootKey] && storage[rootKey][valueKey]
          ? storage[rootKey][valueKey]
          : undefined;
      }

      function set(rootKey, valueKey, value) {
        storage[rootKey] = storage[rootKey] || {};
        storage[rootKey][valueKey] = value;
      }
    })();

    if (ROOT_FOLDER.getId() != USER_FOLDER.getId()) {
      let rootFiles = ROOT_FOLDER.getFiles();
      while (rootFiles.hasNext()) {
        rootFiles.next().moveTo(USER_FOLDER);
      }
    }
    return {
      get RootFolder() { return ROOT_FOLDER; },
      get UserFolder() { return USER_FOLDER; },

      read(filepath) {
        let content = Storage.getContent(filepath);
        if (!content) {
          let file = findFile(filepath);
          let ext = obtainFileExtension(filepath);
          if (file) {
            let blob = tryGetBlob(file);
            content = ext == 'json' ? (JSON.parseFromString(blob) || []) : blob;
          } else {
            content = ext == 'json' ? [] : '';
          }
          Storage.setContent(filepath, content);
        }
        return Selector.sliceCopy(content);
      },

      write(filepath, content) {
        let file = findFile(filepath) || createFile(filepath);
        let ext = obtainFileExtension(filepath);
        let raw = ext == 'json' ? JSON.stringify(content) : content;
        trySetContent();

        function trySetContent() {
          try {
            file.setContent(raw);
            Storage.setContent(filepath, content);
            if (raw.length > 0 && file.getSize() == 0) {
              trySetContent();
            }
          } catch (error) {
            Admin.printError(`При записи в файл произошла ошибка\n`, error.stack);
            Admin.pause(5);
            trySetContent();
          }
        }
      },

      append(filepath, content, place = 'end', limit = 100000) {
        if (!content || content.length == 0) return;
        let currentContent = read(filepath);
        let ext = obtainFileExtension(filepath);
        return ext == 'json' ? appendJSON() : appendString();

        function appendJSON() {
          return place == 'begin'
            ? appendNewData(content, currentContent)
            : appendNewData(currentContent, content);

          function appendNewData(xData, yData) {
            let allData = [];
            Combiner.push(allData, xData, yData);
            Selector.keepFirst(allData, limit);
            write(filepath, allData);
            return allData.length;
          }
        }

        function appendString() {
          let raw = place == 'begin' ? (content + currentContent) : (currentContent + content);
          write(filepath, raw);
          return raw.length;
        }
      }
    };

    function findFile(filepath) {
      let file = Storage.getFile(filepath);
      if (!file) {
        let [folder, filename] = parsePath(filepath, false);
        if (folder) {
          let iterator = folder.getFilesByName(filename)
          file = iterator.hasNext() ? iterator.next() : undefined;
        }
        Storage.setFile(filepath, file);
      }
      return file;
    }

    function createFile(filepath) {
      let [folder, filename] = parsePath(filepath, true);
      let file = folder.createFile(filename, '');
      Storage.setFile(filepath, file);
      return file;
    }

    function parsePath(filepath, isCreateFolder) {
      let path = filepath.split('/');
      let filename = path.splice(-1, 1)[0];
      let rootFolder = USER_FOLDER;
      if (path.length > 0) {
        if (['user', '.'].includes(path[0])) {
          path.splice(0, 1);
        } else if (['root', '..'].includes(path[0])) {
          rootFolder = ROOT_FOLDER;
          path.splice(0, 1);
        }
      }
      return [path.reduce((root, name) => getFolder(root, name, isCreateFolder), rootFolder),
      formatFileExtension(filename)];
    }

    function getFolder(root, name, isCreateFolder) {
      if (!root) return;
      let iterator = root.getFoldersByName(name);
      if (iterator.hasNext()) {
        return iterator.next()
      } else if (isCreateFolder) {
        return root.createFolder(name);
      }
    }

    function formatFileExtension(filename) {
      if (!filename.includes('.')) {
        filename += `.${obtainFileExtension(filename)}`;
      }
      return filename;
    }

    function obtainFileExtension(filename) {
      let ext = filename.split('.');
      return ext.length == 2 ? ext[1] : 'json';
    }

    function tryGetBlob(file) {
      if (!file) return '';
      try {
        return file.getBlob().getDataAsString();
      } catch (error) {
        Admin.printError('При получении данных из файла произошла ошибка\n', error.stack);
        Admin.pause(5);
        return tryGetBlob(file);
      }
    }
  })()

  const Combiner = (function () {
    Array.prototype.pushArrays = function (...rest) {
      this.push(...rest.flat(1));
      return this;
    }

    Array.prototype.replace = function (array) {
      this.length = 0;
      return this.pushArrays(array);
    }

    return {
      replace(oldArray, newArray) {
        return oldArray.replace(newArray);
      },

      push(source, ...rest) {
        return source.pushArrays(...rest);
      }
    }
  })()

  const Converter = (function () {
    return {
      mapToStrIds(value) {
        if (typeof value == 'string' || typeof value == 'number') {
          return `${value}`;
        }
        let array = Array.isArray(value) ? value : [value];
        let ids = array.map(item => {
          item = item.track || item;
          let id = item.id || '';
          if (item.kind) {
            id = `${item.uid || Auth.UserId}:${item.kind}`;
          } else if (item.albums && item.albums.length > 0) {
            id = `${item.id}:${item.albums[0].id}`;
          }
          return id;
        });
        return ids.filter(item => item.length > 0);
      },

      splitTrackIds(value) {
        if (value[0].hasOwnProperty('albumId')) {
          return value;
        }
        let array = typeof value[0] == 'string' ? value : Converter.mapToStrIds(value);
        return array.map(str => {
          [id, albumId] = str.split(':');
          return { id: id, albumId: albumId };
        });
      },
    }
  })()

  const Order = (function () {
    Array.prototype.shuffle = function () {
      for (let i = this.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
      }
    }

    return {
      shuffle(array) {
        return array.shuffle();
      },

      reverse(array) {
        return array.reverse();
      }
    }
  })()

  const Playlist = (function () {
    return {
      /**
       * Получить треки плейлиста(-ов) в одном массиве.
       * @param {Array.<{kind: String, userId: String}>} value 
       * @returns {Array} Треки
       */
      getTracks(value) {
        if (typeof value == 'string' || typeof value == 'number') {
          return Wrapper.Playlists.getPlaylistWithTracks(arguments[0], arguments[1]).tracks;
        }
        let playlists = Wrapper.Playlists.getPlaylists(value);
        return playlists.map((p, i) => {
          value[i].playlist = Wrapper.Playlists.getPlaylistWithTracks(p.kind, p.uid);
          return value[i].tracks;
        }).flat(1);
      },

      /**
       * Создать новый плейлист.
       * @param {({name: String, tracks: Array, description: String, visibility: String})} data 
       * @returns {String} Идентификатор плейлиста
       */
      saveAsNew(data) {
        let p = Wrapper.Playlists.createEmptyPlaylist(data.name, data.visibility);
        return modifyPlaylist(p, data);
      },

      /**
       * Обновить плейлист. Добавляет треки в начало или конец списка.
       * @param {({name: String, tracks: Array, description: String, visibility: String, at: String})} data 
       * @returns {String} Идентификатор плейлиста
       */
      saveWithAppend(data) {
        let p = findOrCreateUserPlaylist(data.name, data.kind);
        return modifyPlaylist(p, data);
      },

      /**
      * Обновить плейлист. Заменяет все треки.
      * @param {({name: String, tracks: Array, description: String, visibility: String})} data 
      * @returns {String} Идентификатор плейлиста
      */
      saveWithReplace(data) {
        let p = findOrCreateUserPlaylist(data.name, data.kind);
        data.isReplace = true;
        return modifyPlaylist(p, data);
      }
    }

    function findOrCreateUserPlaylist(name, kind) {
      let playlist;
      if (kind) {
        playlist = Wrapper.Playlists.getPlaylistWithTracks(kind);
      }
      if (!playlist) {
        let collection = Wrapper.Playlists.getUserPlaylists();
        playlist = collection.find(item => item.title == name);
      }
      if (!playlist) {
        playlist = Wrapper.Playlists.createEmptyPlaylist(name);
      }
      return playlist;
    }

    function modifyPlaylist(p, data) {
      let at = data.at == 'end' ? p.trackCount : 0;
      if (data.isReplace && p.trackCount > 0) {
        Wrapper.Playlists.deleteTracks(p.kind, 0, p.trackCount, p.revision);
        p.revision++;
      }
      data.tracks.length > 0 && Wrapper.Playlists.insertTracks(p.kind, data.tracks, at, p.revision);
      data.name != p.name && Wrapper.Playlists.changeName(p.kind, data.name);
      data.description != p.description && Wrapper.Playlists.changeDescription(p.kind, data.description);
      data.visibility != p.visibility && Wrapper.Playlists.changeVisibility(p.kind, data.visibility);
      return Converter.mapToStrIds(p)[0];
    }
  })()

  const Filter = (function () {
    return {
      /**
       * Исключить треки из массива по примеру.
       * @param {Array} target Откуда исключить треки.
       * @param {Array} example Какие треки исключить.
       * @param {Boolean} invert Инверсия результата.
       * @param {String} mode Режим выбора исполнителей: `every` или `first`.
       */
      removeTracks(target, example, invert = false, mode = 'every') {
        let ids = idToKey(example);
        let names = example.map(item => getTrackKeys(item)).flat(1);
        target.replace(target.filter(item => invert ^ (
          !ids.hasOwnProperty(item.id) &&
          !getTrackKeys(item, mode).some(name => names.includes(name))
        )));
      },

      /**
      * Исключить исполнителей из массива по примеру.
      * @param {Array} target Откуда исключить исполнителей.
      * @param {Array} example Каких исполнителей исключить.
      * @param {Boolean} invert Инверсия результата.
      * @param {String} mode Режим выбора исполнителей: `every` или `first`.
      */
      removeArtists(target, example, invert = false, mode = 'every') {
        let artists = example.map(item => item.artists
          ? mode == 'every' ? item.artists : item.artists[0]
          : item
        ).flat(1);
        let ids = idToKey(artists);
        target.replace(target.filter(item => invert ^
          !getArtistIds(item, mode).some(id => ids.hasOwnProperty(id))
        ));
      },

      /**
       * Оставить элементы, которые удовлетворяют регулярному выражению.
       * @param {Array} items Проверяемые элементы.
       * @param {String} regex Регулярное выражение.
       * @param {Boolean} invert Инверсия результата.
       */
      match(items, strRegex, invert = false) {
        let regex = new RegExp(strRegex, 'i');
        items.replace(items.filter((item) => {
          item = item.track || item;
          if (typeof item == 'undefined') {
            return false;
          } else if (item.hasOwnProperty('albums') && item.hasOwnProperty('artists')) {
            return invert ^ (test(item.title) || (item.version && test(item.version))
              || item.albums.every(a => test(a.title) || (a.version && test(a.version)))
              || item.artists.every(a => test(a.name))
            );
          }
          return invert ^ test(item.name || item.title);
        }));

        function test(str) {
          return regex.test(str.clearName());
        }
      }
    }

    function getTrackKeys(item, mode) {
      item = item.track || item;
      return mode == 'every'
        ? item.artists.map(artist => `${artist.name} ${item.title}`.clearName())
        : [`${item.artists[0].name} ${item.title}`.clearName()];
    }

    function getArtistIds(item, mode) {
      return mode == 'every'
        ? item.artists ? item.artists.map(a => a.id) : [item.id]
        : item.artists ? [item.artists[0].id] : [item.id]
    }

    function idToKey(array) {
      return array.reduce((result, item, i) => (result[item.id] = i, result), {});
    }
  })()

  const Selector = (function () {
    Array.prototype.sliceFirst = function (count) {
      return this.slice(0, count);
    }

    Array.prototype.sliceLast = function (count) {
      return this.slice(getLimitIndexForLast(this, count));
    }

    Array.prototype.sliceAllExceptFirst = function (skipCount) {
      return this.slice(skipCount);
    }

    Array.prototype.sliceAllExceptLast = function (skipCount) {
      return this.slice(0, getLimitIndexForLast(this, skipCount));
    }

    Array.prototype.copy = function () {
      return this.slice();
    }

    Array.prototype.sliceRandom = function (count) {
      if (!count) return this;
      let copyArray = this.copy();
      Order.shuffle(copyArray);
      return copyArray.sliceFirst(count);
    }

    return {
      keepFirst(array, count) {
        return array.replace(array.sliceFirst(count));
      },

      keepLast(array, count) {
        return array.replace(array.sliceLast(count));
      },

      keepAllExceptFirst(array, skipCount) {
        return array.replace(array.sliceAllExceptFirst(skipCount));
      },

      keepAllExceptLast(array, skipCount) {
        return array.replace(array.sliceAllExceptLast(skipCount));
      },

      keepRandom(array, count) {
        if (!count) return;
        return array.replace(array.sliceRandom(count));
      }
    }

    function getLimitIndexForLast(array, count) {
      return array.length < count ? 0 : array.length - count;
    }
  })()

  const Wrapper = (function () {
    return {
      Albums: {
        getAlbums(albumIds) {
          return getArray('album', albumIds);
        },

        getAlbumWithTracks(albumId) {
          return request()
            .withPath(`/albums/${albumId}/with-tracks`)
            .get();
        }
      },

      Artists: {
        getAlbums(artistId, page = 0, size = 200, sortBy = 'year') {
          return request()
            .withPath(`/artists/${artistId}/direct-albums`)
            .withQuery({ page: page, 'page-size': size, 'sort-by': sortBy })
            .get();
        },

        getArtists(artistIds) {
          return getArray('artist', artistIds);
        },

        getBriefInfo(artistId) {
          return request()
            .withPath(`/artists/${artistId}/brief-info`)
            .get();
        },

        getTracks(artistId, page = 0, size = 200) {
          return request()
            .withPath(`/artists/${artistId}/tracks`)
            .withQuery({ page: page, 'page-size': size })
            .get();
        }
      },

      Contexts: {
        get(contextCount, trackCount, types = 'artist,album,playlist,radio', otherTracks = false) {
          return request()
            .withPath(`/users/${Auth.UserId}/contexts`)
            .withQuery({
              otherTracks: otherTracks,
              contextCount: contextCount,
              trackCount: trackCount,
              types: types
            }).get();
        }
      },

      Importer: {
        getProgress(type, importCode) {
          return request()
            .withPath(`/import/${importCode}/${type}s`)
            .get();
        },

        importPlaylist(name, strTracks) {
          return request()
            .withPath('/import/playlist')
            .withQuery({ title: name })
            .withContentType('text/plain')
            .withBody(strTracks)
            .post();
        },

        importTracks(strTracks) {
          return request()
            .withPath('/import/tracks')
            .withBody({ content: strTracks })
            .post();
        }
      },

      Likes: (function () {
        String.prototype.toTitleCase = function () {
          return this[0].toUpperCase() + this.slice(1);
        }

        const ACTION_TYPE = { ADD: 'add-multiple', REMOVE: 'remove' };
        const OBJECT_TYPE = ['track', 'album', 'artist', 'playlist'];
        let methods = OBJECT_TYPE.reduce((methods, objType) => {
          methods[`add${objType.toTitleCase()}s`] = (ids) => post('likes', objType, ACTION_TYPE.ADD, ids);
          methods[`remove${objType.toTitleCase()}s`] = (ids) => post('likes', objType, ACTION_TYPE.REMOVE, ids);
          methods[`getLiked${objType.toTitleCase()}s`] = (userId) => get('likes', objType, userId);
          return methods;
        }, {});
        methods['addDislikeTracks'] = (ids) => post('dislikes', 'track', ACTION_TYPE.ADD, ids);
        methods['removeDislikeTracks'] = (ids) => post('dislikes', 'track', ACTION_TYPE.REMOVE, ids);
        methods['getDislikedTracks'] = () => get('dislikes', 'track');
        return methods;

        function get(subpath, objType, userId) {
          return request()
            .withPath(`/users/${userId || Auth.UserId}/${subpath}/${objType}s`)
            .get();
        }

        function post(subpath, objType, actionType, payload) {
          return request()
            .withPath(`/users/${Auth.UserId}/${subpath}/${objType}s/${actionType}`)
            .withBody({ [`${objType}Ids`]: Converter.mapToStrIds(payload) })
            .post();
        }
      })(),

      Playlists: (function () {
        return {
          getPlaylistWithTracks(kind, userId) {
            return request()
              .withPath(`/users/${userId || Auth.UserId}/playlists/${kind}`)
              .get();
          },

          getPlaylists(playlistIds) {
            return getArray('playlist', playlistIds);
          },

          getUserPlaylists(userId) {
            return request()
              .withPath(`/users/${userId || Auth.UserId}/playlists/list`)
              .get();
          },

          getRecommendations(kind, userId) {
            return request()
              .withPath(`/users/${userId || Auth.UserId}/playlists/${kind}/recommendations`)
              .get();
          },

          createEmptyPlaylist(name, visibility = 'public') {
            return request()
              .withPath(`/users/${Auth.UserId}/playlists/create`)
              .withBody({ title: name, visibility: visibility })
              .post();
          },

          changeName(kind, name) {
            return change('name', kind, { value: name });
          },

          changeDescription(kind, text) {
            return change('description', kind, { value: text });
          },

          changeVisibility(kind, visibility) {
            return change('visibility', kind, { value: visibility });
          },

          insertTracks(kind, tracks, at, revision) {
            return change('change', kind, {
              diff: JSON.stringify([{ op: 'insert', at: at, tracks: Converter.splitTrackIds(tracks) }]),
              revision: revision
            });
          },

          deleteTracks(kind, from, to, revision) {
            return change('change', kind, {
              diff: JSON.stringify([{ op: 'delete', from: from, to: to }]),
              revision: revision
            });
          },
        };

        function change(type, kind, body) {
          return request()
            .withPath(`/users/${Auth.UserId}/playlists/${kind}/${type}`)
            .withBody(body)
            .post();
        }
      })(),

      Search: {
        getItems(text, type = 'all', isAutoCorrect = true, page = 0, isPlaylistBest = false) {
          return request()
            .withPath('/search')
            .withQuery({
              text: text,
              nocorrect: !isAutoCorrect,
              type: type,
              page: page,
              'playlist-in-best': isPlaylistBest,
            })
            .get();
        }
      },

      Tracks: {
        getTracks(trackIds) {
          return getArray('track', trackIds);
        },

        getSimilar(trackId) {
          return request()
            .withPath(`/tracks/${trackId}/similar`)
            .get();
        },

        // текст и язык
        getSupplement(trackId) {
          return request()
            .withPath(`/tracks/${trackId}/supplement`)
            .get();
        }
      },
    }

    function getArray(objType, ids) {
      return request()
        .withPath(`/${objType}s${objType == 'playlist' ? '/list' : ''}`)
        .withBody({ [`${objType}Ids`]: Converter.mapToStrIds(ids) })
        .post();
    }
  })()

  return { Auth, Cache, Combiner, Converter, CustomUrlFetchApp, Filter, Order, Playlist, Selector, Wrapper, customRequest: request }
})()