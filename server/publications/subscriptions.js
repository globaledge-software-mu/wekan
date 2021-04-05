Meteor.publish('subscriptions', function() {
  return Subscriptions.find();
});

Meteor.publish('remainders', function() {
	return Remainders.find();
})