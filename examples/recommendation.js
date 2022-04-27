function updateRecomForPlaylist() {
  const KIND = '3'; // для какого плейлиста рекомендации 
  const COUNT_RND = 10; // 1 пункт = 10 треков похожих на 1 случайный исходный до фильтра
  const COUNT_PLS = 2; // 1 пункт = 5 треков похожих на плейлист в целом

  let playlistTracks = gooex.Playlist.getTracks(KIND).sliceRandom(COUNT_RND);

  let recomTracks = playlistTracks
    .map(t => gooex.Wrapper.Tracks.getSimilar(t.id).similarTracks)
    .flat(1);

  recomTracks.pushArrays(new Array(COUNT_PLS).fill(1)
    .map(_ => gooex.Wrapper.Playlists.getRecommendations(KIND).tracks)
    .flat(1));

  gooex.Filter.removeTracks(recomTracks, gooex.Context.getKit().all);
  gooex.Filter.dedupTracks(recomTracks);

  gooex.Playlist.saveWithReplace({
    name: 'Рекомендации по плейлисту',
    tracks: recomTracks,
  });

  console.log('Найдено треков', recomTracks.length)
}