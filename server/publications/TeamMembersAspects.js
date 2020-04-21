Meteor.publish('team_members_aspects', function() {
  return TeamMembersAspects.find();
});
