---
title: An image shuffle game with VueJS
categories: [computer, javascript, vuejs, game]
---
<div id="vue-app">
  <form v-on:submit.prevent="">
    <div>
    <label>
      Rows:
      <input type="number" min="2" max="100" required v-model.lazy="numRows">
    </label>
    <label>
      Columns:
      <input type="number" min="2" max="100" required v-model.lazy="numCols">
    </label>
    </div>
    <label id="image-url">
      Image URL:
      <input size="32" required v-model.lazy="imageURL">
    </label>
    <button v-on:click="onNewGame">New image from PicSum</button>
  </form>

  <div class="image-board">
    <div class="image-container">
      <img :src="imageURL">
      <div class="image-grid fill">
        <div v-for="row in gridRows">
          <div :class="{ 'image-tile': true, selected: JSON.stringify(tile.pos) === JSON.stringify(selectedViewPos) }"
               :style="tile.style"
               draggable
               v-on:dragstart="onDragStartTile($event, tile.pos)"
               v-on:dragover="onDragOverTile"
               v-on:drop="onDropTile($event, tile.pos)"
               v-on:click="onClickTile(tile.pos)"
               v-for="tile in row"></div>
        </div>
      </div>
      <div class="solved-overlay fill" v-if="isSolved">
        <div>
          <!-- Note that because Jekyll also uses double braces for templating, VueJs is reconfigured to use brace-parenthesis instead. -->
          <p>Solved in {( formatDuration(duration) )}, and {( formatQuantity(numMoves, 'move', 'moves') )}!</p>
          <button v-on:click="onNewGame">One more!</button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  #vue-app {
    /* Makes the image board stretch over the entire page. */
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  form {
    /* Some styling to make the form stand out. */
    background-color: rgba(100, 100, 100, 0.1);
    border: 1px solid rgba(50, 50, 50, 0.1);
    margin: 16px 32px;
    padding: 16px 16px;

    /* A layout to allow row/column inputs to be on the same line. */
    display: flex;
    flex-direction: column;
  }

  form > div {
    /* A layout to allow row/column inputs to be on the same line. */
    display: flex;
  }

  form label {
    flex: 1;
    margin: 16px 16px;
  }

  form label > input {
    margin-left: 8px;
  }

  form input:invalid {
    /* Highlight bad input. */
    background-color: rgb(255, 222, 222);
  }

  #image-url {
    display: flex;
  }

  #image-url input {
    flex: 1;
  }

  form button {
    /* The button shouldn't stretch, but be centered. */
    align-self: center;
  }

  .fill {
    /* Stretch an element across the "position: relative" ancestor. */
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .image-board {
    margin: 16px 16px;
    outline: 4px solid black;

    /* Make the board fill the page width. */
    flex: 1;

    /* Make the children stretch. */
    display: flex;
  }

  .image-container {
    /* Cover the entire parent. */
    flex: 1;

    /* Adapt to the width of the children, and allow us to stretch
     * them while maintaining aspect ratio. */
    display: inline-block;

    /* Allow a fit class to make the tiles cover the hidden image. */
    position: relative;
  }

  .image-container > img {
    /* A hidden image just to make the elements size correctly. */
    visibility: hidden;
    width: 100%;
  }

  .image-grid {
    /* Making this black allows us to use opacity on hover to darken a tile. */
    background-color: black;

    /* Lay out uniform rows. */
    display: flex;
    flex-direction: column;
  }

  .image-grid > * {
    /* The rows should fill up the container. */
    flex: 1;

    /* Lay out uniform columns. */
    display: flex;
  }

  .image-tile:hover {
    /* Highlight tiles on hover. */
    opacity: 0.8;
    outline: 4px solid rgb(100, 100, 255);
    z-index: 20;
  }

  .image-tile.selected {
    outline: 4px solid rgb(100, 255, 100);
    z-index: 10;
  }

  .solved-overlay {
    /* Hide the image a bit, to make text easier to read. */
    background-color: rgba(200, 200, 255, 0.95);

    /* Center everything in the overlay. */
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.js"></script>
<script>
Vue.config.devtools = true;
new Vue({
  // Use custom delimiters to avoid interfering with Jekyll templating
  // (which is used for this blog).
  delimiters: ["{(",")}"],
  el: '#vue-app',
  data () {
    return {
      // The URL to display.
      imageURL: this.getRandomImage(),
      // The number of rows.
      numRows: 3,
      // The number of columns.
      numCols: 3,

      // A mapping from view-coordinate to model-coordinate. Keys are encoded
      // as [column, row] in JSON, since JS only supports string keys in objects.
      // I.e. modelPositions['[0,2]'] contains the image coordinate for the tile
      // in the first column and third row. Values are simply [column, row].
      modelPositions: {},
      // The Date when the user first interacted with the game board.
      startTime: null,
      // The Date when the puzzle was solved.
      endTime : null,
      // The number of moves made to solve the puzzle.
      numMoves: 0,

      // Which view coordinate the user has selected for a swap.
      selectedViewPos: null,
    };
  },

  // Called by VueJS when the Vue instance is first created. It initializes
  // the modelPositions.
  created () {
    this.resetModelPositions();
  },

  computed: {
    // Generates the rows and columns to display. Each tile is an object
    // containing it's position as [column, row], and a style object to
    // place the background image, based on the tile's model position.
    gridRows () {
      let rows = [];
      for (let i = 0; i < this.numRows; ++i) {
        let cols = [];
        for (let j = 0; j < this.numCols; ++j) {
          let pos = [j, i];
          let modelPos = this.modelPositions[JSON.stringify(pos)];
          cols.push({
            pos: pos,
            style: {
              flex: 1,
              'background-image': `url(${this.imageURL})`,
              'background-position': `${100*modelPos[0]/(this.numCols-1)}% ${100*modelPos[1]/(this.numRows-1)}%`,
              'background-size': `${this.numCols*100}% ${this.numRows*100}%`,
            },
          });
        }
        rows.push(cols);
      }
      return rows;
    },

    // Whether the puzzle is currently solved.
    isSolved () {
      // We just compare each modelPositions to see if the key (view space)
      // and value (model space) coordinates are the same.
      return Object.entries(this.modelPositions).every(
          ([key, modelPos]) => key === JSON.stringify(modelPos));
    },

    // How long the game lasted, in milliseconds. Returns `null` until
    // the game as ended.
    duration () {
      if (this.endTime === null) {
        return null;
      }
      return this.endTime.getTime() - this.startTime.getTime();
    },
  },
  methods: {
    // Called when a tile is being dragged over another tile.
    onDragOverTile (e) {
      // We have to tell the browser that dragging is allowed, by
      // disabling the normal mouse interactions.
      e.preventDefault();
    },

    // Called when dragging a tile starts. We keep track of the view
    // coordinate of the dragged tile.
    onDragStartTile (e, pos) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
      e.dataTransfer.setData('text/x-view-coordinates', JSON.stringify(pos));
    },

    // Called when dropping a tile. We use the drag and drop positions
    // to perform a swap.
    onDropTile (e, dropPos) {
      e.preventDefault();
      let dragPosJSON = e.dataTransfer.getData('text/x-view-coordinates');
      this.swapTiles(JSON.parse(dragPosJSON), dropPos);
    },

    // Called when the user clicked on a tile.
    onClickTile (pos) {
      if (this.selectedViewPos === null) {
        this.selectedViewPos = pos;
        return;
      }

      // Only record a swap if the user clicked different tiles.
      if (JSON.stringify(this.selectedViewPos) !== JSON.stringify(pos)) {
        this.swapTiles(this.selectedViewPos, pos);
      }

      this.selectedViewPos = null;
    },

    // Called when the user wants to replace the current image.
    onNewGame () {
      this.imageURL = this.getRandomImage();
      this.resetModelPositions();
      this.startTime = null;
      this.endTime = null;
      this.numMoves = 0;
    },

    // Formats some milliseconds as an English text like "1 day, 45 minutes".
    // It truncates the output after the two largest units.
    formatDuration (milliseconds) {
      if (milliseconds === null) {
        return null;
      }

      let strs = [];
      [
        [86400000, 'day', 'days'],
        [3600000, 'hour', 'hours'],
        [60000, 'minute', 'minutes'],
        [1000, 'second', 'seconds'],
      ].forEach(([mult, singular, plural]) => {
        let value = Math.floor(milliseconds / mult);
        if (value === 1) {
          strs.push(`${value} ${singular}`);
        } else if (value > 1) {
          strs.push(`${value} ${plural}`);
        }
        milliseconds -= value * mult;
      });
      if (strs.length === 0) {
        return 'no time at all';
      }
      return strs.slice(0, 2).join(', ');
    },

    // Formats an integer quantity as an English string.
    formatQuantity(v, singular, plural) {
      if (v === 1) {
        return `${v} ${singular}`;
      }
      return `${v} ${plural}`;
    },

    // Returns a PicSum image with a random seed. Using the seed ensures
    // determinism, which is needed as we load the image several times.
    getRandomImage() {
      return `https://picsum.photos/seed/${(Math.random() * 1000).toFixed()}/400`;
    },

    // Swaps two tiles (given in view space). Updates player stats.
    swapTiles (posA, posB) {
      let posAKey = JSON.stringify(posA);
      let posBKey = JSON.stringify(posB);
      let tmp = this.modelPositions[posAKey];
      this.modelPositions[posAKey] = this.modelPositions[posBKey];
      this.modelPositions[posBKey] = tmp;

      if (this.startTime === null) {
        this.startTime = new Date();
      }
      this.numMoves++;
    },

    // Re-shuffles the board.
    resetModelPositions () {
      this.modelPositions = this.getShuffledPositions(this.numCols, this.numRows);
    },

    // Returns an object (see modelPositions) where values are shuffled.
    getShuffledPositions (numCols, numRows) {
      let keys = [], values = [];
      for (let i = 0; i < this.numRows; ++i) {
        for (let j = 0; j < this.numCols; ++j) {
          let pos = [j, i];
          keys.push(JSON.stringify(pos));
          values.push(pos);
        }
      }
      for (let i = 0; i < 10; ++i) {
        this.shuffle(values);
        if (JSON.stringify(values.map(JSON.stringify)) !== JSON.stringify(keys)) {
          return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
        }
      }

      // We don't want to freeze the browser on invalid input,
      // so we give up after 10 attempts and just bomb out.
      throw new Error('Failed to shuffle the board in 10 attempts.');
    },

    // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
    shuffle (arr) {
      for (let i = arr.length - 1; i > 0; --i) {
        let j = Math.floor(Math.random() * (i + 1));
        let tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    },
  },
  watch: {
    // Recalculates the model position grid whenever any size changes.
    numCols: 'resetModelPositions',
    numRows: 'resetModelPositions',

    // Watches the isSolved computed property and records the end time
    // when the board goes from unsolved to solved.
    isSolved (newValue) {
      if (newValue) {
        this.endTime = new Date();
      }
    },
  },
});
</script>
