const torrentManager = require('../../workflow/torrentManager')

const now = new Date();
torrentManager.searchTorrents('A Star Is Born')
  .then(result => {
    const benchmark = new Date().getTime() - now.getTime();
    console.log(`Done! took ${benchmark}ms`);

    console.log(result)
  })