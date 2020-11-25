Logos = new FS.Collection('logos', {
  stores: [
    new FS.Store.GridFS('logos'),
  ],
  filter: {
    maxSize: 100000, // 100 kb
    allow: {
      contentTypes: ['image/*'],
    },
  },
});

function allowThis() {
  return true;
}

Logos.allow({
  insert: allowThis,
  update: allowThis,
  remove: allowThis,
  download() { return true; },
  fetch: [],
});

