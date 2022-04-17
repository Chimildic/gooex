/** gooex build 2022.04.16
 * Смешанный код goofy и gooex
 * Перенос плейлистов Spotify в Яндекс.Музыку
 */
function exportSpotifyPlaylists() {
  let ids = [
    '37i9dQZF1DX0PYkdiz2e8k', '37i9dQZF1DWYmDNATMglFU', '6TySxsLwRVYqEh7LZ6fyq8',
    '79AOdu3ELUDHkDPJT1rXUt'
  ];

  ids.forEach(id => {
    let p = Playlist.getById(id);
    let tracks = Source.getPlaylistTracks('', id);
    let strTracks = spotifyTracksToString_(tracks);

    gooex.Playlist.saveWithReplace({
      name: p.name,
      tracks: gooex.Importer.importTracks(strTracks),
      description: p.description
    });
  });

  function spotifyTracksToString_(tracks) {
    return tracks.map(t => `${t.artists[0].name} ${t.name}`.formatName()).join('\r\n');
  }
}