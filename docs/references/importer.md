---
layout: default
title: Importer
parent: Справочник
permalink: /reference/importer
---

## importTracks

Найти треки в базе Яндекс.Музыки.

### Аргументы
{: #importtracks-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `strTracks` | Строка / Массив | Названия треков. |
| `delay` | Число | Пауза между запросом прогресса поиска. По умолчанию 200 миллисекунд. |

### Возврат
{: #importtracks-return }

`tracks` (Массив) - Найденные треки.
