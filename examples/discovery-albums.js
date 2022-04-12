/** gooex build 2022.04.12
 * Собрать треки из альбомов с лайками
 */
function discoveryAlbums() {
  const TRACKS_PER_ALBUM = 1;
  const TARGET_COUNT = 20;

  let recomTracks = [];
  let kit = gooex.Context.getKit();
  kit.liked.shuffle();

  for (let i = 0; i < kit.liked.length; i++) {
    let bestTracks = gooex.Album.getBestTracks(kit.liked[i]);
    gooex.Filter.removeTracks(bestTracks, kit.all);
    gooex.Filter.removeTracks(bestTracks, recomTracks);
    recomTracks.pushArrays(bestTracks.sliceRandom(TRACKS_PER_ALBUM));
    if (recomTracks.length >= TARGET_COUNT) {
      break;
    }
  }

  gooex.Playlist.saveWithReplace({
    // kind: '',
    name: 'Открытия с альбомов',
    tracks: recomTracks.sliceFirst(TARGET_COUNT),
    description: 'Обязательно понравится',
    visibility: 'public'
  });
}