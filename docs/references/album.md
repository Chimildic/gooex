---
layout: default
title: Album
parent: Справочник
permalink: /reference/album
---

## getAlbumWithTracks

Получить альбом с треками.

### Аргументы 
{: #getalbumwithtracks-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `value` | Строка / Альбом / Трек | Объект содержащий идентификатор альбома |

### Возврат
{: #getalbumwithtracks-return }

`album` (Объект) - Треки доступны по ключу `volumes`.

<details>

```js
{
  id: 12322464,
  title: 'Aurora',
  type: 'single',
  metaType: 'music',
  year: 2020,
  releaseDate: '2020-10-23T00:00:00+03:00',
  coverUri: 'avatars.yandex.net/get-music-content/2441215/a9bf21c8.a.12322464-1/%',
  ogImage: 'avatars.yandex.net/get-music-content/2441215/a9bf21c8.a.12322464-1/%',
  genre: 'pop',
  buy: [],
  trackCount: 1,
  likesCount: 202,
  recent: false,
  veryImportant: false,
  artists:
    [
      { id: 3139727, name: 'K-391', various: false, composer: false, cover: [Object], genres: [] },
      { id: 6100305, name: 'RØRY', various: false, composer: false, cover: [Object], genres: [] },
    ],
  labels: [{ id: 417064, name: 'MER' }, { id: 1007409, name: 'Liquid State' }],
  available: true,
  availableForPremiumUsers: true,
  availableForMobile: true,
  availablePartially: false,
  bests: [],
  duplicates:
    [
      {
        id: 13171878,
        title: 'Aurora',
        type: 'single',
        metaType: 'music',
        version: 'The Remixes',
        year: 2020,
        releaseDate: '2020-12-25T00:00:00+03:00',
        coverUri: 'avatars.yandex.net/get-music-content/2411511/b17f8d05.a.13171878-1/%',
        ogImage: 'avatars.yandex.net/get-music-content/2411511/b17f8d05.a.13171878-1/%',
        genre: 'electronics',
        buy: [],
        trackCount: 3,
        likesCount: 21,
        recent: false,
        veryImportant: false,
        artists: [Object],
        labels: [Object],
        available: true,
        availableForPremiumUsers: true,
        availableForMobile: true,
        availablePartially: false,
        bests: [Object],
      },
    ],
  sortOrder: 'asc',
  volumes: [[[Object]]],
  pager: { total: 1, page: 0, perPage: 1 },
}
```

</details>

## getBestTracks

Получить популярные треки альбома. Они помечаются иконкой молнии в интерфейсе Яндекс.Музыки.

### Аргументы
{: #getbesttracks-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `value` | Строка / Альбом / Трек | Объект содержащий идентификатор альбома |

### Возврат
{: #getbesttracks-return }

`bestTracks` (Массив) - Популярные треки альбома.

<details>

```js
[{
  id: '70276097',
  realId: '70276097',
  title: 'All the Drinks',
  major: { id: 251, name: 'AWAL' },
  available: true,
  availableForPremiumUsers: true,
  availableFullWithoutPermission: false,
  durationMs: 221240,
  storageDir: '',
  fileSize: 0,
  r128: { i: -8.19, tp: -0.07 },
  previewDurationMs: 30000,
  artists: [[Object]],
  albums: [[Object]],
  coverUri: 'avatars.yandex.net/get-music-content/2424959/ed6def95.a.11854756-1/%',
  ogImage: 'avatars.yandex.net/get-music-content/2424959/ed6def95.a.11854756-1/%',
  lyricsAvailable: true,
  lyricsInfo: { hasAvailableSyncLyrics: true, hasAvailableTextLyrics: true },
  best: true,
  type: 'music',
  rememberPosition: false,
  trackSharingFlag: 'COVER_ONLY'
},
{
  id: '70276120',
  realId: '70276120',
  title: 'Colonize My Heart',
  major: { id: 251, name: 'AWAL' },
  available: true,
  availableForPremiumUsers: true,
  availableFullWithoutPermission: false,
  durationMs: 198220,
  storageDir: '',
  fileSize: 0,
  r128: { i: -7.63, tp: -0.1 },
  previewDurationMs: 30000,
  artists: [[Object]],
  albums: [[Object]],
  coverUri: 'avatars.yandex.net/get-music-content/2424959/ed6def95.a.11854756-1/%',
  ogImage: 'avatars.yandex.net/get-music-content/2424959/ed6def95.a.11854756-1/%',
  lyricsAvailable: true,
  lyricsInfo: { hasAvailableSyncLyrics: true, hasAvailableTextLyrics: true },
  best: true,
  type: 'music',
  rememberPosition: false,
  trackSharingFlag: 'COVER_ONLY'
}]
```

</details>