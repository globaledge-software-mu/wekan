Remainders = new Mongo.Collection('remainders');

Remainders.attachSchema(new SimpleSchema({
	invitee :{
		type: String
	},
	messageContent:{
		type:String
	},
	nextRunAt:{
	  type:Date,
	  optional:true
	},
	lastRunAt : {
		type: Date,
		optional: true
	},
}));