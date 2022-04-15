---
layout: default
title: Использование
nav_order: 3
description: ""
permalink: /usage
toc: true
---

# Использование

gooex состоит из модулей. Сейчас мало документации на каждую функцию. Однако принцип работы схож с [goofy](https://github.com/Chimildic/goofy).

- `Wrapper` - обертка над API Яндекс.Музыки. Входные аргументы и результат почти никак не обрабатываются, выдаются _как есть_.
- `Auth`, `CustomUrlFetchApp`, `Converter` - системные, вспомогательные модули. В общем случае использоваться не будут.
- Остальные модули можно назвать основными. Они преобразуют входные аргументы и ответы от `Wrapper` для более удобной работы и чистого кода.

## Базовый пример

Любое обращение к модулям начинается с `gooex.` - чтобы избегать конфликта имен с модулями goofy.

```js
// Получить треки моего плейлиста с kind = 1100
let playlistTracks = gooex.Playlist.getTracks('1100');

// Получить треки плейлиста c kind = 2513 от пользователя music-blog
let indieTracks = gooex.Playlist.getTracks('2513', 'music-blog');

// Можно получить треки из нескольких плейлистов других пользователей
// Но нужно знать uid (user id)
// Для экономии запросов, выведите uid в консоль и подставьте в код
console.log(gooex.Wrapper.Users.getInfo('music-blog').uid); // Получим 103372440

let allTracks = gooex.Playlist.getTracks([
    { kind: '1108', uid: '103372440' },
    { kind: '1475', uid: '103372440' },
    { kind: '1878', uid: '103372440' },
    { kind: '2394' } // без uid подставляется ваш
]);
```

## Расширенный пример

Алгоритм для генерации плейлиста _Открытия с альбомов_ был переписан под специфику Яндекс.Музыки. Некоторые возможности еще не реализованы, другие недоступны. Код приведен в папке [examples](https://github.com/Chimildic/gooex/blob/master/examples/discovery-albums.js). 

В коде используется функция `Context.getKit`, которая вернет набор `kit` с часто используемыми массивами: `liked`, `disliked`, `recent`, а также их сумма `all`. Каждый из них содержит упрощенный объект трека (`id` и `albumId`). Такой формат подойдет многим функциям. В частности для `Filter.removeTracks`.

Однако в некоторых случаях нужные полные объект. Например, `Filter.match` - здесь `Context.getKit` уже не подойдет, следует использовать функцию `gooex.Like.getLikedTracks`. Она подгрузит полные объекты треков, но это увеличит время выполнения, особенно при большом количестве элементов.

## Импорт в Яндекс из Spotify

Все модули gooex заточены только под Яндекс.Музыку. Чтобы перенести треки из Spotify в Яндекс нужно преобразовать массив треков в строку с названиями и отправить ее в импорт Яндекса.

```js
// Смешанный код - goofy и gooex
function importToYandex() {
  let recentTracks = RecentTracks.get(20);
  let strTracks = spotifyTracksToString_(recentTracks);

  let yandexTracks = gooex.Importer.importTracks(strTracks);
  gooex.Playlist.saveAsNew({
    name: 'История из Spotify',
    tracks: yandexTracks,
  });
}

function spotifyTracksToString_(tracks) {
  return tracks.map(t => `${t.artists[0].name} ${t.name}`.formatName()).join('\r\n');
}
```

## Экспорт из Яндекса в Spotify

Аналогичным образом происходит перенос в Spotify. Возможно ситуация, когда Яндекс дает упрощенные объекты треков, о которых говорилось выше. В таком случае нужно дополнительно вызвать функцию `gooex.Wrapper.Tracks.getTracks` для получения полных объектов.

Spotify не дает возможность массового импорта. Поэтому каждый трек ищем отдельным запросов. Большое количество треков спровоцирует много пауз. Поэтому для переноса, например, 2 тысяч треков - разбейте их на две группы и запускайте функцию для каждой.

```js
// Смешанный код - goofy и gooex
function importToSpotify(){
  let yandexLikes = gooex.Like.getLikedTracks();
  let strTracks = yandexTracksToString_(yandexLikes);

  let spotifyTracks = Search.multisearchTracks(strTracks);
  Playlist.saveAsNew({
    name: 'Лайки из Яндекс.Музыки',
    tracks: spotifyTracks,
  });
}

function yandexTracksToString_(tracks) {
  return tracks.map(t => {
    t = t.track || t;
    return `${t.artists[0].name} ${t.title}`.clearName();
  });
}
```
