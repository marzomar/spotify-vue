Vue.component('Track', {
    template: `
    <div>
        <p>{{ track.name }}</p>
        <audio controls>
            <source :src="track.preview_url" />
        </audio>
    </div>
    `,
    props: ['track'],
    data: () => {
        return {}
    },
});

Vue.component('Album', {
    template: `
    <div class="album">
        <div class="album-cover">
            <img v-if="image" :src="image"/>
            <h3 class="album-name">{{ name }}</h3>
        </div>
        <ul class="tracks spotify-list">
            <li
                class="track"
                v-for="(track, t) in tracks"
                :key="t">
                <Track :track="track"></Track>
            </li>
        </ul>
    </div>
    `,
    props: ['albumId'],
    data: () => {
        return {
            name: '',
            tracks: [],
            image: null
        }
    },
    mounted: function() {
        var self = this;
        getAlbum(this.albumId).then((response) => {
            self.name = response.name;
            self.tracks = response.tracks.items;
            self.image = response.images.length > 0 ? response.images[0].url : null;
        })
    }
});

var app = new Vue({
    el: '#app',
    data: () => {
        return {
            albums: [],
            artistName: "",
            artists: [],
            selectedArtist: null
        }
    },
    watch: {
        selectedArtist(newValue) {
            if (newValue !== null) {
                this.artists = [];
                this.artistName = newValue.name;
                var self = this;
                getAlbums(newValue.id).then((albums) => {
                    self.albums = albums;
                }).catch((err) => {
                    console.log(err);
                })
            } else {
                this.albums = [];
            }
        }
    },
    methods: {
        selectArtist(artist) {
            // vider les albums avant de changer d'artiste
            this.albums = [];
            this.selectedArtist = {
                id: artist.id,
                name: artist.name,
                image: artist.images.length > 0 ? artist.images[0].url : null
            }
        },
        searchArtists() {
            var self = this;
            this.selectedArtist = null;
            if (this.artistName !== '') {
                searchArtist(self.artistName).then((artists) => {
                    self.artists = artists;
                }).catch((err) => {
                    console.log(err);
                })
            } else {
                this.artists = [];
            }
        }
    },
})