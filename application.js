$(document).ready(function() {
  var UPDATETIME = 10;
  var roomNamesById = {};
  var tagNamesById = {};

  getTagNames();
  getGatewayNames(getCurrentRoomData);
  getHistoricalData();

  function getGatewayNames(callback) {
    var fbGateways = new Firebase("https://bletracker.firebaseio.com/gateways/");
    fbGateways.once("value", function(s) {
      s.forEach(function(cs) {
        roomNamesById[cs.key()] = cs.val().location;
      });
      clearRoomDivs();
      createRoomDivs();
      if (callback) { callback() };
    });
  }

  function getTagNames() {
    var fbGateways = new Firebase("https://bletracker.firebaseio.com/tags/");
    fbGateways.once("value", function(s) {
      s.forEach(function(cs) {
        tagNamesById[cs.key()] = cs.val().name;
      });
    });
  }

  function getHistoricalData() {
    var fbMoveTracker = new Firebase("https://bletracker.firebaseio.com/moveTracker/");
    var data = {};
    //get initial data & listen for changes
    fbMoveTracker.on("child_added", function(childSnapshot) {
      data.preLoc = roomNamesById[childSnapshot.val().locBefore];
      data.currLoc = roomNamesById[childSnapshot.val().locNow];
      data.tag = tagNamesById[childSnapshot.val().tag];
      data.ts = (new Date(childSnapshot.val().time * 1000)).toLocaleTimeString();
      updateHistory(data);
    });
  }

  function updateHistory(data) {
    if (data.preLoc) {
      $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Moved from "+data.preLoc+" into "+data.currLoc+"</td></tr>")
    } else {
      $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Entered "+data.currLoc+"</td></tr>")
    }
  }

  //creates room divs based on locaton data from Firebase
  function createRoomDivs() {
    //variables
    var roomName = "";
    //creates first room div
    if ($(".room").length === 0) {
      $(".rt-tracker .row").prepend("<div class='col-md-4 room'><h2></h2></div>");
    }

    //loops through gateways from database
    //adds gwId to class or creates div & adds gwId class
    for (gwId in roomNamesById) {
      // adds id class and h2 text to first room div
      // or fills in room data / divs
      if ($(".room h2").text() === "") {
        $(".room").addClass("rm-"+gwId);
        $(".room h2").text(roomNamesById[gwId]);
      } else {
        //creates a regExp to track room div
        roomNamesById[gwId] ? roomName = new RegExp(roomNamesById[gwId]) : roomName = "";
        //if gateway has a location/room add id class to div or create a new div
        if (roomName) {
          var classAdded = false;
          for (var i = 0; i < $(".room h2").length; i++) {
            if (roomName.test(($(".room h2")[i]).innerHTML)) {
              ($(".room h2")[i]).parentNode.classList.add("rm-"+gwId);
              classAdded = true;
              break;
            }
          }
          if (!classAdded) {
            $(".rt-tracker .row").prepend("<div class='col-md-4 room rm-"+gwId+"'><h2>"+roomNamesById[gwId]+"</h2></div>");
          }
        }
      }
    }
  }

  //clears room divs
  function clearRoomDivs() {
    $(".rt-tracker .row").html("");
  }

  function createTagWidget(data) {
    $("."+data.tag).html("");
    $(".rm-"+data.roomID).append("<ul class='"+data.tag+"'><li>"+data.tag+"</li><li>RSSI: "+data.rssi+"</li><li class='time-stamp'>updated "+data.ts+"</li></ul>")
  }

  //Opens connection to firebase and updates location of tags
  function getCurrentRoomData() {
    var fbCurrentRoom = new Firebase("https://bletracker.firebaseio.com/roomTracker/");
    var data = {};
    //get initial data
    fbCurrentRoom.once("value", function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        data.roomID = childSnapshot.key();
        data.roomName = roomNamesById[childSnapshot.key()];
        childSnapshot.forEach(function(t) {
          data.tag = tagNamesById[t.key()];
          data.rssi = t.val().rssi;
          // dataTS = new Date(t.val().time * 1000);

          // translateTime(dataTS, data)
          data.ts = (new Date(t.val().time * 1000)).toLocaleTimeString();
          createTagWidget(data);
        });
      });
    });
    //listen for changes
    fbCurrentRoom.on("child_changed", function(childSnapshot, prevChildName) {
      data.roomID = childSnapshot.key();
      data.roomName = roomNamesById[childSnapshot.key()];
      childSnapshot.forEach(function(t) {
        data.tag = tagNamesById[t.key()];
        data.rssi = t.val().rssi;
        // dataTS = new Date(t.val().time * 1000);

        // translateTime(dataTS, data)
        data.ts = (new Date(t.val().time * 1000)).toLocaleTimeString();
        createTagWidget(data);
      })
    });
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