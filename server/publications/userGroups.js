Meteor.publish('user_groups', function() {
  return UserGroups.find();
});
