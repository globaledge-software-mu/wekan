Meteor.publish('logos', function() {
  return Logos.find();
});
