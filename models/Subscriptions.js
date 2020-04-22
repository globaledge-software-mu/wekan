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


  Meteor.startup(() => {

		// Cron job to check for expired subscriptions
		SyncedCron.add({
		  name: 'check-for-expired-subscriptions',
		  schedule: function(parser) {
		    // parser is a later.parse object
		  	// fires at 03:01 am every day
		    return parser.text('at 03:01 am');
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
	  				}
  				);
		  	});
	
		  }
		}); // End of the "Cron job to check for expired subscriptions"

  	const envs = Environment.find();
  	const env = Environment.findOne();
  	//   *******  The block of codes in the following if statement shall run ONLY when the APP is in PRODUCTION  ******* 
  	if (envs.count() > 0 && envs.count() < 2 && env && env._id && env.title && env.title === 'production') {
  		// Cron job to check for SOON-TO-BE expired subscriptions && 
  		// notify the subscriber by sending him an e-mail for he needs 
  		// to renew his subscription as soon as possible 
  		SyncedCron.add({
  		  name: 'check-for-soon-to-be-expired-subscriptions',
  		  schedule: function(parser) {
  		    // parser is a later.parse object
  		  	// fires at 03:01 am every day
  		    return parser.text('at 03:01 am');
  		  },
  		  job: function() {
  		  	Subscriptions.find({
  		  		archived: { $ne: true },
  				  status: { $nin: ['cancelled', 'suspended'] },
  		  		expiresOn: { $gte: new Date() }, 
  		  	}).forEach((subscription) => {
  		  		const expirationDate = new Date(subscription.expiresOn);
  		  		expirationDate.setHours(0,0,0,0);
  	
  		  		const date = expirationDate.getDate();
  		  		const month = expirationDate.getMonth();
  		  		const year = expirationDate.getFullYear();
  	
  		  		const currentDay = new Date();
  		  		currentDay.setHours(0,0,0,0);
  	
  		  		const oneWeekBeforeExpiration = new Date(expirationDate);
  		  		oneWeekBeforeExpiration.setHours(0,0,0,0);
  		  		oneWeekBeforeExpiration.setDate(date - 7);
  	
  		  		const twoWeeksBeforeExpiration = new Date(expirationDate);
  		  		twoWeeksBeforeExpiration.setHours(0,0,0,0);
  		  		twoWeeksBeforeExpiration.setDate(date - 14);
  	
  		  		const threeWeeksBeforeExpiration = new Date(expirationDate);
  		  		threeWeeksBeforeExpiration.setHours(0,0,0,0);
  		  		threeWeeksBeforeExpiration.setDate(date - 21);
  	
  		  		const oneMonthBeforeExpiration = new Date(expirationDate);
  		  		oneMonthBeforeExpiration.setHours(0,0,0,0);
  		  		oneMonthBeforeExpiration.setMonth(month - 1);
  	
  		  		const twoMonthsBeforeExpiration = new Date(expirationDate); 
  		  		twoMonthsBeforeExpiration.setHours(0,0,0,0);
  		  		twoMonthsBeforeExpiration.setMonth(month - 2);
  	
  		  		const user = Users.findOne({_id: subscription.subscriberId});
  	  			const userGroup = UserGroups.findOne({_id: subscription.userGroupId});
  	  			const plan = Plans.findOne({_id: subscription.planId});
  	
  		  		if (user && user._id && userGroup && userGroup._id && plan && plan._id) {
  		  			const subscriber = user.username;
  		  			const subscriberEmail = user.emails[0].address;
  		  			const planTitle = plan.title;
  		  			const userGroupTitle = userGroup.title;
  	
  			  		if (currentDay.getTime() == expirationDate.getTime()) {
  			  			//notify the subscriber that his subscription expired today
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expired-today-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expired-today-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		} else if (currentDay.getTime() == oneWeekBeforeExpiration.getTime()) {
  			  			//notify the subscriber that only one week is left for his subscription to expire 
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-one-week-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-one-week-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		} else if (currentDay.getTime() == twoWeeksBeforeExpiration.getTime()) {
  			  			//notify the subscriber that only two weeks are left for his subscription to expire 
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-two-weeks-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-two-weeks-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		} else if (currentDay.getTime() == threeWeeksBeforeExpiration.getTime()) {
  			  			//notify the subscriber that only three weeks are left for his subscription to expire 
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-three-weeks-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-three-weeks-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		} else if (currentDay.getTime() == oneMonthBeforeExpiration.getTime() && subscription.billingCycle != 'monthly') {
  			  			//notify the subscriber that only one month is left for his subscription to expire 
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-one-month-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-one-month-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		} else if (currentDay.getTime() == twoMonthsBeforeExpiration.getTime() && subscription.billingCycle != 'monthly') {
  			  			//notify the subscriber that only two months is left for his subscription to expire 
  			  	    try {
  			  	      const params = {
  		  	          subscriber,
  		  	          planTitle,
  		  	          userGroupTitle,
  		  	        };
  			  	      const lang = user.profile.language;
  			  	      Email.send({
  			  	        to: subscriberEmail,
  			  	        from: Accounts.emailTemplates.from,
  			  	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-two-months-subject', params, lang), 
  			  	        text: TAPi18n.__('email-notify-subscriber-his-subscription-expires-after-two-months-text', params, lang),
  			  	      });
  			  	    } catch (e) {
  			  	      throw new Meteor.Error('email-fail', e.message);
  			  	    }
  			  		}
  		  		}
  		  	});
  		  }
  		}); // End of the "Cron job to check for SOON-TO-BE expired subscriptions && send the subscriber an e-mail to remind him that he needs to renew his subscription asap"

  		// This line is to start processing the cron jobs
  	  SyncedCron.start();
  	} else {
  		SyncedCron.remove('check-for-soon-to-be-expired-subscriptions');

  		// This line is to start processing the cron jobs
  	  SyncedCron.start();
  	}

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
