Payments = new Mongo.Collection('payments');

Payments.attachSchema(new SimpleSchema({
	subscriptionId: {
    type: String,
  },
  paidBy: { // paid by whom (user id)
    type: String,
  },
  paidOn: {
    type: Date,
  },
  paidPeriodStartsOn: {
    type: Date,
  },
  paidPeriodEndsOn: {
    type: Date,
  },
  amountPaid: {
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

Payments.helpers({
	//
});

Payments.allow({
  insert() {
  	return true;
  },
  update() {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
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
