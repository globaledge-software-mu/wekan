Subscriptions = new Mongo.Collection('subscriptions');

Subscriptions.attachSchema(new SimpleSchema({
	planId: {
    type: String,
  },
  userGroupId: {
    type: String,
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

Subscriptions.helpers({
	//
});

Subscriptions.allow({
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
