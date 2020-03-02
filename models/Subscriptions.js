Subscriptions = new Mongo.Collection('subscriptions');

Subscriptions.attachSchema(new SimpleSchema({
  userGroupId: {
    type: String,
  },
	planId: {
    type: String,
  },
  status: {
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
  archived: {
    type: Boolean,
    autoValue() {
      if (!this.isSet) {
        return false;
      }
    },
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

	// Cron job to check for expired subscriptions
	SyncedCron.add({
	  name: 'checkForExpiredSubscriptions',
	  schedule: function(parser) {
	    // parser is a later.parse object
	  	// fires at 00:01am every day
	    return parser.text('at 00:01 am');
	  },
	  job: function() {

	    // execute codes for verifications of any expired subscriptions if found any, suspend them by resetting all of its userGroup's quota to zero
	  	// all the while  setting the status to 'suspended' and the field 'statusSetOn' of the subscription document
	  	Subscriptions.find({ 
	  		archived: { $ne: true },
			  status: { $nin: ['cancelled', 'suspended'] },
	  		expiresOn: { $lt: new Date() },
	  	}).forEach((subscription) => {
	  		UserGroups.update(
  				{ _id: subscription.userGroupId }, {
  					$set: {
  						usersQuota: 0,
  						usedUsersQuota: 0,
  						boardsQuota: 0,
  						usedBoardsQuota: 0,
  					}
  				}
				);
	  		Subscriptions.update(
  				{ _id: subscription._id }, {
  					$set: {
  					  status: 'suspended',
  					  statusSetOn: new Date(),
  					}
	  		});
	  	});

	  }
	}); // End of the "Cron job to check for expired subscriptions"


	// This line is to start processing the cron jobs
  SyncedCron.start();


	Subscriptions.after.insert((assignerId, doc) => {

		// Once a user's UserGroup is subscribed to a plan, that Usergroup's usersQuota and boardsQuota gets overwritten 
		// with those of the plans and reset the UserGroup's usedUsersQuota and usedBoardsQuota to Nil.
		const plan = Plans.findOne(doc.planId);
		if (plan && plan._id) {
			UserGroups.update(
				{ _id: doc.userGroupId }, { 
					$set: {
						usersQuota: plan.usersQuota, 
						usedUsersQuota: 0, 
						boardsQuota: plan.boardsQuota, 
						usedBoardsQuota: 0,
					}
				}
			);
		}
		//______________//

  }); // End tag of Subscriptions.after.insert()

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
