---
layout: default
title: Importer
parent: Справочник
permalink: /reference/importer
toc: true
---

## importTracks

Найти треки в базе Яндекс.Музыки.

### Аргументы
{: #importtracks-arguments }

| Имя | Тип | Описание |
|-----|-----|----------|
| `strTracks` | Строка | Названия треков. Используйте разделитель `\n`. |
| `delay` | Число | Пауза между запросом прогресса поиска. По умолчанию 200 миллисекунд. |

### Возврат
{: #importtracks-return }

`tracks` (Массив) - Найденные треки.
