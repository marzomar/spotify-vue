// Stock URI où l'application vue est disponible (callback)
const APP_URI = 'http://localhost:8000';
// Stock mon clientId dans une variable
var clientId = 'ce600d0dc10a4f9da41406d90e2cd513';
// Stock mon ClientSecret dans une variable
var clientSecret = 'd8e0977357da403baf95d1b3554779f9';
// Stock dans une variable des parametres GET
var searchParams = new URLSearchParams(window.location.search);
// Récupère le code d'authorization depuis le local storage OU le met à ''
var authorizationCode = localStorage.getItem('authorization_code') || '';

// 1.Function avec condition qui permet de recuperer dans l'url le parametre 'code'
function hasAuthorizationCode() {
    // Vérifier que l'url a bien paramètre GET du nom : code
    if (searchParams.has('code')) {
        // récupère le code depuis le paramètre GET
        authorizationCode = searchParams.get('code');
        // le stock dans le local storage
        localStorage.setItem('authorization_code', authorizationCode);
    }

    
    // retourne si authorizationCode existe
    // Faux s'il vaut une chaine de carctère vide (commme à l'initialisation)
    // Vrai s'il est différent (qu'il a été récupéré)
    return authorizationCode != '';
}

// 2.Function afin de s'authentifier pour permettre à l'appli d'avoir accès aux données
// de l'utilisateur sur spotify
function requestAuthorization() {
    let API_URL = 'https://accounts.spotify.com/fr/authorize?';
    let API_URL_PARAMS = new URLSearchParams({
        client_id: clientId,
        redirect_uri: APP_URI,
        response_type: 'code'
    })
    // Redirection sur la page spotify permettant l'authorization
    location.href = API_URL + API_URL_PARAMS
}

// 3.Function permettant de recuperer l'access_token à partir d'un refresh_token contenu
// dans le local storage
function refreshAccessToken() {
    // retourne une nouvelle promise
    return new Promise((resolve, reject) => {
        // exécute une requête AJAX POST avec Axios
        // avec comme paramètres :
        // refresh_token (qui vient du local storage)
        // redirect_uri (obligatoire mais ne sert à rien dans ce cas)
        // grand_type spécifiant qu'on récupère l'access_token à partir d'un refresh_token
        // avec comme headers
        // Authorization spécifié
        // Content-type spécifié
        // Pourquoi Qs.stringify : voir https://github.com/axios/axios/issues/350
        axios
            .post('https://accounts.spotify.com/api/token', Qs.stringify({
                'refresh_token': localStorage.getItem('refresh_token'),
                'grant_type': 'refresh_token',
                'redirect_uri': APP_URI
            }), {
                headers: {
                    // btoa encode en base64
                    'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
            .then((response) => {
                // si la requête fonctionne stocker l'access_token dans le local storage
                localStorage.setItem('access_token', response.data.access_token);

                // lancer le refresh de l'access token dans 3600 secondes
                setTimeout(refreshAccessToken, response.data.expires_in * 1000);
                // indique la promesse est terminée
                resolve();
            })
            .catch((err) => {
                console.log('Erreur lors du refresh de l\'access_token:', err);
                // s'il y a une erreur, il faut re-demander une authorization (pas besoin de reject
                // puisqu'on change d'url)
                requestAuthorization();
            })
    })
}

// 4. Function permettant de recuperer l'access_token et le stocker en localstorage
function getAccessToken() {
    // retourne une nouvelle promise
    return new Promise((resolve, reject) => {
        // exécute une requête AJAX POST avec Axios
        // avec comme paramètres :
        // code (qui est l'authorizationCode)
        // redirect_uri (obligatoire mais ne sert à rien dans ce cas)
        // grand_type spécifiant qu'on récupère l'access_token à partir d'un authorization_code
        // avec comme headers
        // Authorization spécifiée
        // Content-type spécifié
        // Pourquoi Qs.stringify : voir https://github.com/axios/axios/issues/350
        axios
            .post('https://accounts.spotify.com/api/token', Qs.stringify({
                    'code': authorizationCode,
                    'grant_type': 'authorization_code',
                    'redirect_uri': APP_URI
                }), {
                    headers: {
                        // encode in base 64
                        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
            })
            .then((response) => {
                // si on récupère une réponse, c'est qu'on a l'access_token et le refres_token
                // on les stock dans le local storage
                localStorage.setItem('access_token', response.data.access_token);
                localStorage.setItem('refresh_token', response.data.refresh_token);

                // met à jour l'access_token dans 3600 secondes
                setTimeout(refreshAccessToken, response.data.expires_in * 1000);
                // indique que la promesse est terminée
                resolve();
            })
            .catch((err) => {
                console.log('Error lors de la récupération de l\'access_token :', err);
                // Si c'est une erreur 400 = BAD_REQUEST alors, demander une nouvelle authorization
                if (err.response.status === 400) {
                    requestAuthorization();
                }
                // indiquer que la promesse a rencontré une erreur
                reject(err);
            })
    })
}



// 5. Récupérer les ablums d'un artiste
function getAlbums(artistId) {
    // retourne une nouvelle promise
    return new Promise((resolve, reject) => {
        // exécute une requête AJAX GET avec Axios
        // avec comme paramètres de route :
        // l'id d'un artiste
        // avec comme header
        // Authorization avec Bearer + access_token
        axios
            .get('https://api.spotify.com/v1/artists/' + artistId + '/albums', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            })
            .then((response) => {
                // si la requête s'est bien passée, alors renvoyer les données reçues
                resolve(response.data.items);
            })
            .catch((err) => {
                // s'il y a eu une erreur unauthorized, forcer le refresh de l'access token
                // et relancer la requête
                refreshAccessToken()
                    .then(() => {
                        // si le refresh token fonctionne,
                        // redemander l'album
                        // et resolve si ça se passe bien
                        getAlbums(artisteId).then((albums) => {
                            resolve(albums)
                        })
                    })
                    .catch((err) => {
                        // si le refresh token ne fonctionne pas, refaire l'authorization
                        requestAuthorization();
                    })
            })
    })
}

// 5. Récupérer les données d'un album
function getAlbum(albumId) {
    // retourne une nouvelle promise
    return new Promise((resolve, reject) => {
        // exécute une requête AJAX GET avec Axios
        // avec comme paramètres de route :
        // l'id d'un album
        // avec comme header
        // Authorization avec Bearer + access_token
        axios
            .get('https://api.spotify.com/v1/albums/' + albumId, {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            })
            .then((response) => {
                // si la requête s'est bien passée, alors renvoyer les données reçues
                resolve(response.data);
            })
            .catch((err) => {
                // s'il y a eu une erreur unauthorized, forcer le refresh de l'access token
                // et relancer la requête
                refreshAccessToken()
                    .then(() => {
                        // si le refresh token fonctionne,
                        // redemander l'album
                        // et resolve si ça se passe bien
                        getAlbum(albumId).then((album) => {
                            resolve(album)
                        })
                    })
                    .catch((err) => {
                        // si le refresh token ne fonctionne pas, refaire l'authorization
                        requestAuthorization();
                    })
            })
    })
}

//6. recherche un artiste album d'un artiste
function searchArtist(artiste) {
    // retourne une nouvelle promise
    return new Promise((resolve, reject) => {
        // exécute une requête AJAX GET avec Axios
        // avec comme paramètres :
        // l'id de l'artiste
        // type avec pour valeur artiste pour spécifier que c'est ce que l'on cherche
        // avec comme header
        // Authorization avec Bearer + access_token
        axios
            .get('https://api.spotify.com/v1/search?q=' + artiste + '&type=artist', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
                }
            })
            .then((response) => {
                // si la requête s'est bien passée, alors renvoyer les données reçues
                resolve(response.data.artists.items);
            })
            .catch((err) => {
                // s'il y a eu une erreur unauthorized, forcer le refresh de l'access token
                // et relancer la requête
                refreshAccessToken()
                    .then(() => {
                        // si le refresh token fonctionne,
                        // redemander l'album
                        // et resolve si ça se passe bien
                        getArtiste().then((artist) => {
                            resolve(artist)
                        })
                    })
                    .catch((err) => {
                        // si le refresh token ne fonctionne pas, refaire l'authorization
                        requestAuthorization();
                    })
            })
    })
}

// S'il n'y a pas de code d'authorization dans l'url OU dans le local storage
// et qu'il n'y a pas d'access token, récupérer l'authorization
if (!hasAuthorizationCode() && !localStorage.getItem('access_token')) {
    requestAuthorization();
}
// s'il n'y a pas d'access token dans le local storage, le récupérer
if (!localStorage.getItem('access_token')) {
    getAccessToken();
}