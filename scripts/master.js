
var final_transcript = '';
var last10messages = [];




$(document).ready(function () {
  $("#sohbetler").on('click', 'li', function () {
    var id = $(this).html();
    var sohbetler = $(".conversation");
    for (var i = 0; i < sohbetler.length; i++) {
      var gel = $(sohbetler[i]).attr("id");
      if (id.toUpperCase() == gel.toUpperCase()) {
        $(sohbetler[i]).css("display", "block");
      }
      else {
        $(sohbetler[i]).css("display", "none");
      }
    }
  });
});

function toggleNameForm() {
  $("#login-screen").toggle();
}

function toggleChatWindow() {
  $("#main-chat-screen").toggle();
}

// Pad n to specified size by prepending a zeros
function zeroPad(num, size) {
  var s = num + "";
  while (s.length < size)
    s = "0" + s;
  return s;
}

// Format the time specified in ms from 1970 into local HH:MM:SS
function timeFormat(msTime) {
  var d = new Date(msTime);
  return zeroPad(d.getHours(), 2) + ":" +
    zeroPad(d.getMinutes(), 2) + ":" +
    zeroPad(d.getSeconds(), 2) + " ";
}

$(document).ready(function () {
  //setup "global" variables first
  var socket = io.connect("127.0.0.1:3000");
  var myRoomID = null;

  $("form").submit(function (event) {
    event.preventDefault();
  });

  $("#conversation").bind("DOMSubtreeModified", function () {
    $("#conversation").animate({
      scrollTop: $("#conversation")[0].scrollHeight
    });
  });

  $("#main-chat-screen").hide();
  $("#errors").hide();
  $("#name").focus();
  //$("#join").attr('disabled', 'disabled');



  //enter screen
  $("#nameForm").submit(function () {
    var name = $('select option:selected').html();
    var id = $('select option:selected').val()
    socket.emit("joinserver",name );
    toggleNameForm();
    toggleChatWindow();
    $("#msg").focus();
  });

  $("#name").keypress(function (e) {
    var name = $("#name").val();
    if (name.length < 2) {
      $("#join").attr('disabled', 'disabled');
    } else {
      $("#errors").empty();
      $("#errors").hide();
      $("#join").removeAttr('disabled');
    }
  });

  //GÖNDERME
  $("#chatForm").submit(function () {
    var msg = $("#msg").val();
    var people = $("#people").find("li");
    var sohbets = $(".conversation");
    var name;
    for (var i = 0; i < sohbets.length; i++) {
      var display = $(sohbets[i]).css("display");
      if (display == "block") {
        name = $(sohbets[i]).attr("id");
      }
    }

    if (msg != "") {
      socket.emit("send", new Date().getTime(), msg, name);
      $("#msg").val("");
    }



  });


  socket.on("whisper", function (msTime, msg, gonderen, gonderilen, odaName) {
    var conv = $("#" + odaName).find("#msgs");
    $(conv).append("<li><strong><span class='text-success'>" + timeFormat(msTime) + gonderen.name + "(" + gonderilen + ")</span></strong>: " + msg + "</li>");
    //clear typing field
    //$("#" + person.name + "").remove();
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 0);
  });
  socket.on("chat", function (msTime, person, msg) {
    $("#msgs").append("<li><strong><span class='text-success'>" + timeFormat(msTime) + person.name + "</span></strong>: " + msg + "</li>");
    //clear typing field
    //$("#" + person.name + "").remove();
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 0);
  });
  socket.on("room-chat", function (msTime, person, msg, name) {
    var conv = $("#" + name).find("#msgs");
    $(conv).append("<li><strong><span class='text-success'>" + timeFormat(msTime) + person.name + "</span></strong>: " + msg + "</li>");
    //clear typing field
    //$("#" + person.name + "").remove();
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 0);
  });
  //'is typing' message
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;
    socket.emit("typing", false);
  }

  $("#msg").keypress(function (e) {
    if (e.which !== 13) {
      if (typing === false && $("#msg").is(":focus")) {
        typing = true;
        socket.emit("typing", true);
      } else {
        clearTimeout(timeout);
        //timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  socket.on("isTyping", function (data) {
    if (data.isTyping) {
      if ($("#" + data.person + "").length === 0) {
        $("#updates").append("<li id='" + data.person + "'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " is typing.</small></li>");
        timeout = setTimeout(timeoutFunction, 5000);
      }
    } else {
      $("#" + data.person + "").remove();
    }
  });



  ///BURAYA BAKACAZ
  $("#rooms").on('click', '.joinRoomBtn', function () {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    var li = $(this).parent();

    

    socket.emit("joinRoom", roomID);
    var html = "<button id=" + roomID + " class='leaveRoomBtn btn btn-default btn-xs'>Ayrıl</button>";
    $(li).html("<span>" + roomName + "</span>" + html);
    var sohbetler = $(".conversation")
    var liste = $("#sohbetler");
    liste.append("<li>" + roomName + "</li>");

    for (var i = 0; i < sohbetler.length; i++) {
      var gel = $(sohbetler[i]).attr("id");
      if (roomName.toUpperCase() == gel.toUpperCase()) {
        $(sohbetler[i]).css("display", "block");
      }
      else {
        $(sohbetler[i]).css("display", "none");
      }
    }
  });

  $("#rooms").on('click', '.leaveRoomBtn', function () {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    var liste = $("#sohbetler li");
    var conv = $(".conversation");
    var people = $("#people").find("li");
    var onlineId;
    
    for (var i = 0; i < liste.length; i++) {
      var gel = $(liste[i]).html();
      if (roomName.toUpperCase() == gel.toUpperCase()) {
        $(liste[i]).remove();
      }
    }
    var alan = $("#" + roomName);
    alan.css("display", "none");
    var li = $(this).parent();
    var html = "<button id=" + roomID + " class='joinRoomBtn btn btn-default btn-xs'>Katıl</button>";
    $(li).html("<span>" + roomName + "</span>" + html);
    socket.emit("leaveRoom", roomID, onlineId);
    $("#genel").css("display", "block");
  });



  socket.on("history", function (data) {
    if (data.length !== 0) {
      $("#msgs").append("<li><strong><span class='text-warning'>Son 10 mesaj:</li>");
      $.each(data, function (data, msg) {
        $("#msgs").append("<li><span class='text-warning'>" + msg + "</span></li>");
      });
    } else {
      $("#msgs").append("<li><strong><span class='text-warning'>Eski mesaj yok.</li>");
    }
  });

  socket.on("update", function (msg, name) {
    $("#msgs").append("<li>" + msg + "</li>");
  });
  socket.on("update-room", function (msg, name) {
    var conv = $("#" + name).find("#msgs");
    $(conv).append("<li>" + msg + "</li>");
  });

  $("#people").on('click', '.whisper', function () {

    var name = $(this).siblings("span").text();
    $("#msg").val("w:" + name + ":");
    $("#msg").focus();
   
  });
  

  socket.on("update-people", function (data) {
    //var peopleOnline = [];
    $("#people").empty();
    $('#people').append("<li class=\"list-group-item active\">Kişiler <span class=\"badge\">" + data.count + "</span></li>");

    $.each(data.people, function (a, obj) {


      $('#people').append("<li class=\"list-group-item\"><span>" + obj.name + "</span> <i class=\"fa fa-" + obj.device + "\"></i><button  class='whisper btn btn-default btn-xs'>Mesaj At</button></li>");


    });
    

  });





  socket.on("roomList", function (data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">Odalar<span class=\"badge\">" + data.count + "</span></li>");
    if (!jQuery.isEmptyObject(data.rooms)) {
      $.each(data.rooms, function (id, room) {
        var html = "<button id=" + id + " class='joinRoomBtn btn btn-default btn-xs' >Katıl</button>";//"<button id=" + id + " class='removeRoomBtn btn btn-default btn-xs'>Kaldır</button>";
        $('#rooms').append("<li id=" + id + " class=\"list-group-item\"><span>" + room.name + "</span> " + html + "</li>");
      });
    } else {
      $("#rooms").append("<li class=\"list-group-item\">Henüz oda yok</li>");
    }
  });

  socket.on("sendRoomID", function (data) {
    myRoomID = data.id;
  });

  socket.on("disconnect", function () {
    $("#msgs").append("<li><strong><span class='text-warning'>Server hizmet vermiyor</span></strong></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

});
