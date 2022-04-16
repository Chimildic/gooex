/** gooex build 2022.04.16
 * Собрать треки из персональных плейлистов (Тайник, Дежавю и т.д.)
 */
function updatePersonalPlaylist() {
  let kit = gooex.Context.getKit(undefined, 2000, 20);

  let includeTypes = [
    'recentTracks', 'neverHeard', 'origin', 'playlistOfTheDay'
  ]; // podcasts, family, kinopoisk

  let tracks = gooex.Landing.getPersonalTracks(...includeTypes);
  gooex.Filter.removeTracks(tracks, kit.all);
  gooex.Filter.match(tracks, '^[a-zA-Z0-9 ]+$'); // только латиница

  gooex.Playlist.saveWithReplace({
    name: 'Персональные треки',
    tracks: tracks,
    description: 'Собрано из персональных плейлистов',
  });
}