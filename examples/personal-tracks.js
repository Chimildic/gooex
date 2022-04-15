/** gooex build 2022.04.15
 * Собрать треки из персональных плейлистов (Тайник, Дежавю и т.д.)
 */
function updatePersonalPlaylist() {
    let kit = gooex.Context.getKit(undefined, 2000, 20);

    let tracks = gooex.Landing.getPersonalTracks();
    gooex.Filter.removeTracks(tracks, kit.all);

    gooex.Playlist.saveWithReplace({
        name: 'Персональные треки',
        tracks: tracks,
        description: 'Собрано из персональных плейлистов',
    });
}
