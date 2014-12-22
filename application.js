$(document).ready(function() {
  var UPDATETIME = 10;

  //ID to name objects
  var roomNamesById = {};
  var tagNamesById = {};
  var colorsById = {};


  //Firebase Refercences
  var fbGateways = new Firebase("https://bletracker.firebaseio.com/gateways/");
  var fbTags = new Firebase("https://bletracker.firebaseio.com/tags/");
  var fbMoveTracker = new Firebase("https://bletracker.firebaseio.com/moveTracker/");
  var fbRoomTracker = new Firebase("https://bletracker.firebaseio.com/roomTracker/");
  //Firebase Connections
  var fbMoveTrackerAll, fbMoveTrackerOne


  //// Runtime ////
  getTagNames();
  getGatewayNames(getCurrentRoomData);
  getHistoricalData();

  //// Listeners ////
  $(".tag-sorter").on("click", "a", submitTagSelector);


  //// Firebase Functions ////
  function getGatewayNames(callback) {
    //retrieve stored gateway names
    fbGateways.once("value", function(s) {
      buildGWNames(s);
      buildRoomDivs(callback);
    });
    //open listener for changes in gateway names
    fbGateways.on("child_changed", function(s) {
      buildGWNames(s);
      colorsById = {};
      buildRoomDivs(callback);
    })
  }

  function getTagNames() {
    fbTags.once("value", buildTagNames);
    fbTags.on("child_changed", buildTagNames);
  }

  function getCurrentRoomData() {
    var data = {};
    //get initial data
    fbRoomTracker.once("value", function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        data.roomID = childSnapshot.key();
        data.roomName = roomNamesById[childSnapshot.key()];
        childSnapshot.forEach(function(t) {
          data.tagId = t.key();
          data.tagName = tagNamesById[t.key()];
          data.rssi = t.val().rssi;
          // dataTS = new Date(t.val().time * 1000);

          // translateTime(dataTS, data)
          data.ts = (new Date(t.val().time * 1000)).toLocaleTimeString();
          createTagWidget(data);
        });
      });
    });
    //listen for changes
    fbRoomTracker.on("child_changed", function(childSnapshot, prevChildName) {
      data.roomID = childSnapshot.key();
      data.roomName = roomNamesById[childSnapshot.key()];
      childSnapshot.forEach(function(t) {
        data.tagId = t.key();
        data.tagName = tagNamesById[t.key()];
        data.rssi = t.val().rssi;
        // dataTS = new Date(t.val().time * 1000);

        // translateTime(dataTS, data)
        data.ts = (new Date(t.val().time * 1000)).toLocaleTimeString();
        createTagWidget(data);
      })
    });
  }

  function getHistoricalData() {
    var data = {};
    clearHistory();
    fbMoveTracker.off('child_added', fbMoveTrackerOne);
    fbMoveTrackerAll = fbMoveTracker.limitToLast(100).on("child_added", function(snapshot) {
      buildHistoricalData(snapshot, data);
    });
  }

  function getHistoricalDataByTag(tagId) {
    var data = {};
    clearHistory();
    fbMoveTracker.off('child_added', fbMoveTrackerAll);
    fbMoveTrackerOne = fbMoveTracker.orderByChild("tag").equalTo(tagId).limitToLast(50).on("child_added", function(snapshot) {
      buildHistoricalData(snapshot, data);
    });
  }

  function buildGWNames(snapshot) {
    snapshot.forEach(function(cs) {
      roomNamesById[cs.key()] = cs.val().location;
    });
  }

  function buildTagNames(snapshot) {
    clearSortDropdown();
    snapshot.forEach(function(cs) {
      tagNamesById[cs.key()] = cs.val().name;
      addTagToSortDropdown(cs.key());
    });
  }

  function buildRoomDivs(callback) {
    assignColorsToRooms();
    clearRoomDivs();
    createRoomDivs();
    if (callback) { callback() };
  }

  function buildHistoricalData(snapshot, data) {
    data.preLoc = roomNamesById[snapshot.val().locBefore];
    data.currLoc = roomNamesById[snapshot.val().locNow];
    data.tag = tagNamesById[snapshot.val().tag];
    data.ts = (new Date(snapshot.val().time * 1000)).toLocaleTimeString();
    updateHistory(data);
  }

  //// View Functions ////
  function submitTagSelector(e) {
    e.preventDefault
    var tagId = e.currentTarget.id;
    if(tagId === "all") {
      getHistoricalData();
    } else {
      getHistoricalDataByTag(tagId);
    }
  }

  function updateHistory(data) {
    if (data.preLoc) {
      $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Moved from "+data.preLoc+" into "+data.currLoc+"</td></tr>")
    // } else {
    //   $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Entered "+data.currLoc+"</td></tr>")
    }
  }

  function clearHistory() {
    $(".history tbody").html("");
  }

  function createRoomDivs() {
    //variables
    var roomName = "";
    //creates first room div
    if ($(".room").length === 0) {
      $(".rt-tracker .row").prepend("<div class='col-md-4 room'><h2></h2></div>");
    }

    //loops through gateways from database
    //adds gwId to class or creates div with gwId class
    for (gwId in roomNamesById) {
      // adds id class and h2 text to first room div
      if ($(".room h2").text() === "") {
        $(".room").addClass("rm-"+gwId);
        $(".room h2").text(roomNamesById[gwId]);
      // fills in room data / divs
      } else {
        //creates a regExp to track room div
        roomNamesById[gwId] ? roomName = new RegExp(roomNamesById[gwId]) : roomName = "";
        //if gateway has a location/room
        if (roomName) {
          var classAdded = false;
          // if room div exists add id class to div
          for (var i = 0; i < $(".room h2").length; i++) {
            if (roomName.test(($(".room h2")[i]).innerHTML)) {
              ($(".room h2")[i]).parentNode.classList.add("rm-"+gwId);
              classAdded = true;
              break;
            }
          }
          // if room div doesn't exist create a new div
          if (!classAdded) {
            $(".rt-tracker .row").append("<div class='col-md-4 room rm-"+gwId+"'><h2>"+roomNamesById[gwId]+"</h2></div>");
          }
        }
      }
    }
  }

  function clearRoomDivs() {
    $(".rt-tracker .row").html("");
  }

  function createTagWidget(data) {
    $("."+data.tagId).remove();
    $(".rm-"+data.roomID).append("<ul class='"+data.tagId+" "+colorsById[data.roomID]+"'><li>"+data.tagName+"</li><li>RSSI: "+data.rssi+"</li><li class='time-stamp'>updated "+data.ts+"</li></ul>");
  }

  function addTagToSortDropdown(tagId) {
    $(".tag-sorter ul").append("<li><a href='#tracking-history' id='"+tagId+"'>"+tagNamesById[tagId]+"</a></li>");
  }

  function clearSortDropdown() {
    $(".tag-sorter ul").html("<li><a href='#tracking-history' id='all'>All Tags</a></li>");
  }

  function assignColorsToRooms() {
    var colors = ["blue", "green", "yellow", "purple", "orange"];
    for(var id in roomNamesById) {
      var name = roomNamesById[id];
      if(name === "Out Of Range") {
        colorsById[id] = "red";
      } else if (name) {
        colorsById[id] = colors.shift();
      }
    }
  }

  /////// timestamp functions
  function translateTime(dataTS, data) {
    var secAgo = Math.round((Date.now() - dataTS) / 1000)
    if (secAgo > 60) {
      var minAgo = Math.floor(secAgo / 60)
      data.ts = minAgo + " min ago"
    } else {
      data.ts = secAgo + " sec ago"
    }
    createTagWidget(data);
    updateTimeStamps();
  }

  function updateTimeStamps() {
    console.log($(".time-stamp").length)
    // for(var i=0; i < $(".time-stamp").length; i++) {
    //   console.log($(".time-stamp")[i].text());
    // }
  }

});