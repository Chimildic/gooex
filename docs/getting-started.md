---
layout: default
title: Начало работы
nav_order: 2
description: ""
permalink: /getting-started
---

# Начало работы

Далее процесс настройки gooex

1. Токен можно получить только на аккаунт с двухфакторной авторизацией через приложение Яндекс.Ключ. Подключите его в [Яндекс.Паспорте](https://passport.yandex.ru/profile/access/2fa). 

   > Внимание! Если решите удалить Яндекс.Ключ с телефона, сначала отключите его в Яндекс.Паспорте. Иначе потеряете доступ к аккаунту.

2. Два варианта настройки gooex:

   - Если используете [goofy](https://github.com/Chimildic/goofy), создайте новый файл и скопируйте код [gooex](https://github.com/Chimildic/gooex/blob/master/src/library.js)
   - Если используете только Яндекс.Музыку, скопируйте [проект Apps Script](https://script.google.com/home/projects/1_1Rtdyg0YIxWWOW9NI0seWVdS2C3IVMjhct3y05UL6Yy27YcguIu56iX)

   ![image](https://user-images.githubusercontent.com/40138097/163034707-ca86734c-f93d-4246-9221-15b192587a39.png)

3. Перейдите в файл _main.gs_. Скопируйте функцию `generateYandexToken`, если её нет.

   ```js
   // Сгенерировать токен для Яндекс.Музыки
   function generateYandexToken() {
     gooex.Auth.generateTokenByCredentials('login', 'code');
   }
   ```

4. Впишите свой логин от Яндекс.Почты вместо слова `login`. Впишите код из приложения Яндекс.Ключ вместо слова `code`. Выберите функцию `generateYandexToken` и нажмите _выполнить_.

   > Код из приложения обновляется каждые 30 секунд. Успейте запустить функцию.

   ![image](https://user-images.githubusercontent.com/40138097/163036328-ed816884-2afe-4cfd-95ad-cffa57db95bb.png)

   Если вы скопировали проект, при первом запуске функции `generateYandexToken` появится окно с предупреждением. Нажмите _дополнительные настройки_, затем _перейти на страницу_ и предоставьте доступ. Возможно к этому моменту истечет срок действия кода из Яндекс.Ключа - введите новый и повторите запуск.

   > Игнорируем предупреждение. Потому что пользователь и разработчик - одно лицо, вы.

   ![image](https://user-images.githubusercontent.com/40138097/163037256-8fbc8114-8682-4910-bbc3-5fcee7d01e15.png)

5. Настройка завершена. Можете проверить работоспособность запустив функцию `examplePlaylist`.

   ```js
   // Обновляет плейлист 5 случайными лайками при каждом запуске
   function examplePlaylist() {
     let liked = gooex.Like.getLikedTracks();
     gooex.Playlist.saveWithReplace({
       name: 'Случайные лайки',
       tracks: liked.sliceRandom(5),
       description: 'Плейлист создан с помощью gooex',
       visibility: 'private',
     });
   }
   ```
