AspectsListItems = new Mongo.Collection('aspects_list_items');

AspectsListItems.attachSchema(new SimpleSchema({
	aspectsListId: { 
    type: String,
  },
	cardId: { 
    type: String,
  },
  title: { 
    type: String,
  },
  scoreOf: { 
    type: String, // current or initial
    optional: true,
  },
  score: { 
    type: Number,
    optional: true,
  },
  createdAt: {
    type: Date,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  modifiedAt: {
    type: Date,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isUpdate) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
}));

AspectsListItems.helpers({
	//
});

AspectsListItems.allow({
  insert() {
  	return true;
  },
  update() {
  	return true;
  },
  remove() {
  	return true;
  },
  fetch: [],
})
