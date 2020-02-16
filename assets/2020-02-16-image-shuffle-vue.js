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
          let xPos = 100*modelPos[0]/(this.numCols-1);
          let yPos = 100*modelPos[1]/(this.numRows-1);
          cols.push({
            pos: pos,
            style: {
              flex: 1,
              'background-image': `url(${this.imageURL})`,
              'background-position': `${xPos}% ${yPos}%`,
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
      if (!this.posEqual(pos, this.selectedViewPos)) {
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

    // Whether the given view position is the currently selected tile.
    posEqual (posA, posB) {
      return posA !== null && posB != null && posA.every((a, i) => a === posB[i]);
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
