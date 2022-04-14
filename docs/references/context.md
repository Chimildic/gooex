---
layout: default
title: Context
parent: Справочник
permalink: /reference/context
---

## getRecentTracks

Получить треки истории прослушиваний.

### Аргументы
{: #getrecenttracks-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `trackCount` | Число | Количество треков из источника. |
| `contextCount` | Число | Количество недавних источников (плейлист, альбом и т.д.). По умолчанию 10. |
| `types` | Строка | Количество недавних источников (плейлист, альбом и т.д.). По умолчанию `artist,album,playlist,radio`. |

### Возврат
{: #getrecenttracks-return }

`recentTracks` (Массив) - Треки всех источников в одномерном массиве.

## getKit

Получить набор треков указанного типа.

### Аргументы
{: #getkit-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `types` | Массив | По умолчанию `['liked', 'disliked', 'recent']`. |
| `...rest` | Числа | `trackCount` и `contextCount` для `Context.getRecentTracks` |

### Возврат
{: #getkit-return }

`kit` (Объект) - Содержит массивы треков указанных типов и их сумму по ключу `all`.

<details>

```js
{
    liked: [],
    disliked: [],
    recent: [],
    all: [...liked, ...disliked, ...recent],
}
```

</details>