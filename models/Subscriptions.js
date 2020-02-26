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

Subscriptions.helpers({
	//
});

if (Meteor.isServer) {
	Subscriptions.after.insert((assignerId, doc) => {

		// Once a user's UserGroup is subscribed to a plan, that Usergroup's usersQuota and boardsQuota gets overwritten 
		// with those of the plans and reset the UserGroup's usedUsersQuota and usedBoardsQuota to Nil.
		const plan = Plans.find(doc.planId);
		if (plan && plan._id) {
			UserGroups.update(
				{ _id: doc.userGroupId }, { 
					usersQuota: plan.usersQuota, 
					usedUsersQuota: 0, 
					boardsQuota: plan.boardsQuota, 
					usedBoardsQuota: 0,
				}
			);
		}
		//______________//

  });
}

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
