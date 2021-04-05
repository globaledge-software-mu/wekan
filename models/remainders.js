Remainders = new Mongo.Collection('remainders');

Remainders.attachSchema(new SimpleSchema({
	invitee :{
		type: String
	},
	messageContent:{
		type: Object
	},
	nextRunAt:{
	  type:Date,
	  optional:true
	},
	lastRunAt : {
		type: Date,
		autoValue() {
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
	},
	
}));

Remainders.allow({
	insert() {
	  return true;
	},
  update() {
	  
  },
  remove() {
    return true;
  },
  fetch: [],
});

