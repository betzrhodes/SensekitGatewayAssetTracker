$(document).ready(function() {
  var UPDATETIME = 10;
  // var maxHeight = 0;

  //ID to name objects
  var roomNamesById = {};
  var tagNamesById = {};
  var colorsById = {};
  var avtrImgByName = { "Mr. Penguin" : 'css/img/avtr_penguin.png',
                     "Brionna" : 'css/img/avtr_f_wt_shirt.png',
                     "Brandon" : 'css/img/avtr_m_gr_swtr.png',
                     "Gino" : 'css/img/avtr_m_bl_suit.png',
                     "Matt" : 'css/img/avtr_m_bl_swtr.png',
                     "Betsy" : 'css/img/avtr_f_red_hair.png',
                   };

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
  updateTimeStamps();

  //// Listeners ////
  $(".tag-sorter").on("click", "a", submitTagSelector);

  //// Loops ////
  var tsLoop;

  function updateTimeStamps() {
    tsLoop = window.setInterval(function() {
      for (var i = 0; i < $(".time-stamp").length; i++) {
        $(".time-stamp")[i].innerHTML = "updated: " + moment(parseInt($(".time-stamp")[i].dataset.ts)).fromNow();
      }
    }, 30000);
  }

  function clearTimeStampsLoop() {
    window.clearInterval(tsLoop);
    tsLoop = undefined;
  }


  //// Firebase Functions ////
  function getGatewayNames(callback) {
    //retrieve stored gateway names
    fbGateways.once("value", function(s) {
      buildGWNames(s);
      buildRoomDivs(callback);
    });
    //open listener for changes in gateway names
    fbGateways.on("child_changed", function(s) {
      buildGWNames(s, callback);
    })
  }

  function getTagNames() {
    fbTags.once("value", buildTagNames);
    fbTags.on("child_changed", function(s) {
      buildTagNames(s, getCurrentRoomData);
    });
  }

  function getCurrentRoomData() {
    var data = {};
    //get initial data
    fbRoomTracker.once("value", function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        buildRoomData(childSnapshot, data);
      });
    });
    //listen for changes
    fbRoomTracker.on("child_changed", function(childSnapshot, prevChildName) {
      buildRoomData(childSnapshot, data);
    });
  }

  function getHistoricalData() {
    var data = {};
    clearHistory();
    fbMoveTracker.off('child_added', fbMoveTrackerOne);
    fbMoveTrackerAll = fbMoveTracker.limitToLast(200).on("child_added", function(snapshot) {
      buildHistoricalData(snapshot, data, 100);
    });
  }

  function getHistoricalDataByTag(tagId) {
    var data = {};
    clearHistory();
    fbMoveTracker.off('child_added', fbMoveTrackerAll);
    fbMoveTrackerOne = fbMoveTracker.orderByChild("tag").equalTo(tagId).limitToLast(50).on("child_added", function(snapshot) {
      buildHistoricalData(snapshot, data, 50);
    });
  }

  function buildGWNames(snapshot, callback) {
    if (callback) {
      roomNamesById[snapshot.key()] = snapshot.val().location;
      colorsById = {};
      buildRoomDivs(callback);
      getHistoricalData();
    } else {
      snapshot.forEach(function(cs) {
        roomNamesById[cs.key()] = cs.val().location;
      });
    }
  }

  function buildTagNames(snapshot, callback) {
    clearSortDropdown();
    if (callback) {
      tagNamesById[snapshot.key()] = snapshot.val().name;
      addTagToSortDropdown(snapshot.key());
      callback();
      getHistoricalData();
    } else {
      snapshot.forEach(function(cs) {
        tagNamesById[cs.key()] = cs.val().name;
        addTagToSortDropdown(cs.key());
      });
    }
  }

  function buildRoomDivs(callback) {
    assignColorsToRooms();
    clearRoomDivs();
    createRoomDivs();
    if (callback) { callback() };
  }

  function buildRoomData(snapshot, data) {
    data.roomID = snapshot.key();
    data.roomName = roomNamesById[snapshot.key()];
    snapshot.forEach(function(cs) {
      data.tagId = cs.key();
      data.tagName = tagNamesById[cs.key()];
      if (cs.val().rssi) {
        data.rssi = cs.val().rssi;
      } else {
        data.rssi = "N/A";
      }
      data.ts = moment(cs.val().time * 1000);
      data.rssiStatus = getRSSIStatus(data.rssi);
      createTagWidget(data);
    });
  }

  function buildHistoricalData(snapshot, data, limit) {
    data.preLoc = roomNamesById[snapshot.val().locBefore];
    data.currLoc = roomNamesById[snapshot.val().locNow];
    data.tag = tagNamesById[snapshot.val().tag];
    data.ts = (new Date(snapshot.val().time * 1000)).toLocaleTimeString();
    updateHistory(data, limit);
  }

  function getRSSIStatus(rssi) {
    if (rssi === undefined) { return "status-empty" };
    if (rssi < -79) { return "status-one" };
    if (rssi < -69) { return "status-two" };
    if (rssi < -59) { return "status-three" };
    if (rssi < -49) { return "status-four" };
    if (rssi < -39) { return "status-full" };
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

  function updateHistory(data, limit) {
    if (data.preLoc) {
      $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Moved from "+data.preLoc+" into "+data.currLoc+"</td></tr>")
    // } else {
    //   $(".history tbody").prepend("<tr class = 'data'><td class = 'time'>"+data.ts+"</td><td class = 'name'>"+data.tag+"</td><td class = 'event'>Entered "+data.currLoc+"</td></tr>")
    }
    if ($(".history .data").length > limit) {
      $(".history .data").last().remove();
    }
  }

  function clearHistory() {
    $(".history tbody").html("");
  }

  function createRoomDivs() {
    for (gwId in roomNamesById) {
      var roomNameClass = ""
      if (roomNamesById[gwId]) {
        roomNameClass = roomNamesById[gwId].replace(/\s+/g, "").toLowerCase();
        if ($("." + roomNameClass).length === 1) {
          $("." + roomNameClass).addClass("rm-" + gwId);
        }
        if ($("." + roomNameClass).length === 0) {
          for (var i = 0; i < $(".room h2").length; i++) {
            if ( $(".room h2")[i].innerHTML === "" ) {
              $(".room h2")[i].parentNode.classList.add(roomNameClass);
              $(".room h2")[i].parentNode.classList.add("rm-" + gwId);
              $("." + roomNameClass + " h2").text(roomNamesById[gwId]);
              break;
            }
          }
        }
      }
    }
  }

  function clearRoomDivs() {
    $(".rt-tracker").html('<div class="row top"><div class="col-md-6 room"><h2></h2></div><div class="col-md-6 room"><h2></h2></div></div><div class="row bottom"><div class="col-md-6 room"><h2></h2></div><div class="col-md-6 room outofrange rm-OutOfRange"><h2>Out Of Range</h2></div></div>');
  }

  function createTagWidget(data) {
    var avtrImg = 'css/img/avtr_blank.png'
    if (data.tagName in avtrImgByName) { avtrImg = avtrImgByName[data.tagName]}

    if ($("."+data.tagId).length > 0 ) {
      if ($("."+data.tagId).parent().hasClass("rm-"+data.roomID)) {
        $("."+data.tagId).html("<img class='avtr' src='"+avtrImg+"' height='50' width='40'><ul><li>"+data.tagName+"</li><li>RSSI: "+data.rssi+"</li><li class='time-stamp' data-ts='"+data.ts+"'>updated: "+data.ts.fromNow()+"</li></ul><div class='status "+data.rssiStatus+"'></div>")
      } else {
        $("."+data.tagId).remove();
        $(".rm-"+data.roomID).append("<div class='"+data.tagId+" "+colorsById[data.roomID]+" tag'><img class='avtr' src='"+avtrImg+"' height='50' width='40'><ul><li>"+data.tagName+"</li><li>RSSI: "+data.rssi+"</li><li class='time-stamp' data-ts='"+data.ts+"'>updated: "+data.ts.fromNow()+"</li></ul><div class='status "+data.rssiStatus+"'></div></div>");
      }
    } else {
      $(".rm-"+data.roomID).append("<div class='"+data.tagId+" "+colorsById[data.roomID]+" tag'><img class='avtr' src='"+avtrImg+"' height='50' width='40'><ul><li>"+data.tagName+"</li><li>RSSI: "+data.rssi+"</li><li class='time-stamp' data-ts='"+data.ts+"'>updated: "+data.ts.fromNow()+"</li></ul><div class='status "+data.rssiStatus+"'></div></div>");
    }
  }

  function addTagToSortDropdown(tagId) {
    $(".tag-sorter ul").append("<li><a href='#tracking-history' id='"+tagId+"'>"+tagNamesById[tagId]+"</a></li>");
  }

  function clearSortDropdown() {
    $(".tag-sorter ul").html("<li><a href='#tracking-history' id='all'>All Tags</a></li>");
  }

  function assignColorsToRooms() {
    var colors = ["blue", "yellow", "green", "purple", "orange"];
    var roomColors = {"Out Of Range" : "red"}
    for(var id in roomNamesById) {
      var name = roomNamesById[id];
      if(name === "Out Of Range") {
        colorsById[id] = "red";
      } else if (name) {
        if (roomColors[name]) {
          colorsById[id] = roomColors[name];
        } else {
          var color = colors.shift();
          colorsById[id] = color;
          roomColors[name] = color;
        }
      }
    }
  }

});