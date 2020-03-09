Environment = new Mongo.Collection('environment');

Environment.attachSchema(new SimpleSchema({
	title: { // Unique
    type: String,
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

if (Meteor.isServer) {
  Meteor.startup(() => {

  	if (Meteor.isDevelopment) { // If Local Developement server
	    const env = Environment.find();
	    if (env.count() < 1) {
	    	Environment.insert({
	    		title: 'development'
	    	});
	    }
		} 
  	// Since currently the staging env too is returning true on the check of Meteor.isProduction. 
  	// That's why we will not be using it to check if we are on the production server
  	else { // else has to be on either Staging or Production
  		const env = Environment.findOne();
  		// I had manually entered the doc for the collection Environment for the staging environment
  		// so we'll need two types of checks, 1st, to check with existing environment doc (for the startups 
  		// post the insert in the if block below) and comparing the the string value of the title. 
  		// And 2nd, where there is no doc present (for the first run of this code)
  		if (env && env.title && env.title === 'production') {
  			return false;
  		} else {
	    	Environment.insert({
	    		title: 'production'
	    	});
  		}
		}

  });
}

Environment.allow({
  insert() {
    const user = Users.findOne(Meteor.user()._id);
    if (user && user.isAdmin) {
    	return true;
    } else {
    	return false;
    }
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
