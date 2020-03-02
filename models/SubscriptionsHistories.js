SubscriptionsHistories = new Mongo.Collection('subscriptions_histories');

SubscriptionsHistories.attachSchema(new SimpleSchema({
	subscriptionId: {
    type: String,
  },
	planId: {
    type: String,
  },
  status: {  // (accepted values: , , , , 
    type: String,
    allowedValues: [
      'suspended', 
      'renewed', 
      'upgraded', 
      'cancelled', 
      'new',
    ],
    optional: true,
    defaultValue: null,
  },
  statusSetOn: {
    type: Date,
    optional: true,
    defaultValue: null,
  },
  subscriberId: {
    type: String,
  },
  subscribedOn: {
    type: Date,
  },
  expiresOn: {
    type: Date,
  },
  billingCycle: { // yearly/monthly
    type: String,
  },
  priceSubscribedTo: { // currently use the price directly from the plan's document
    type: Number,
  },
  assignerId: { 
    type: String,
    optional: true,
    defaultValue: null,
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

SubscriptionsHistories.helpers({
	//
});

SubscriptionsHistories.allow({
  insert() {
  	return true;
  },
  update() {
  	return true;
  },
  remove(userId, doc) {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
  },
  fetch: [],
})
