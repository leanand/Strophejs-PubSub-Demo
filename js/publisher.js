
function json2xml(o, tab) {
   var toXml = function(v, name, ind) {
      var xml = "";
      if (v instanceof Array) {
         for (var i=0, n=v.length; i<n; i++)
            xml += ind + toXml(v[i], name, ind+"\t") + "\n";
      }
      else if (typeof(v) == "object") {
         var hasChild = false;
         xml += ind + "<" + name;
         for (var m in v) {
            if (m.charAt(0) == "@")
               xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
            else
               hasChild = true;
         }
         xml += hasChild ? ">" : "/>";
         if (hasChild) {
            for (var m in v) {
               if (m == "#text")
                  xml += v[m];
               else if (m == "#cdata")
                  xml += "<![CDATA[" + v[m] + "]]>";
               else if (m.charAt(0) != "@")
                  xml += toXml(v[m], m, ind+"\t");
            }
            xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
         }
      }
      else {
         xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
      }
      return xml;
   }, xml="";
   for (var m in o)
      xml += toXml(o[m], m, "");
   return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}



var Control = {
  // start admin credentials
  admin_jid: 'admin@localhost',
  admin_pass: 'testing',
  // end admin credentials

  pubsub_server: 'pubsub.' + Config.XMPP_SERVER,
  connection: null,
  connected: false,
  show_raw: true,
  show_log: true,

  // log to console if available
  log: function (msg) { 
    if (Control.show_log && window.console) {
    console.log(msg);
    }
  },

  // simplify connection status messages
  feedback: function(msg, col) {
    $('#connection_status').html(msg).css('color', col);
  },
  
  // show the raw XMPP information coming in
  raw_input: function (data)  { 
    if (Control.show_raw) {
      Control.log('RECV: ' + data);
    }
  },

  // show the raw XMPP information going out
  raw_output: function (data) { 
    if (Control.show_raw) {
      Control.log('SENT: ' + data);
    }
  },

  // called when data is deemed as sent
  on_send: function (data) {
    Control.log("Data Sent");
    $('#message').val('');
    $('#progress').text('message sent').fadeIn().fadeOut(5000);

    return true;
  },

  // push the data to the clients
  publish: function (data) {
    if (data.message == '') return;
    var msg = { test : "test"};
    var data = {
      "message" : msg
    };
   // var _d = $build('data', { 'type' : "visitor disconnected" }).t(data.message).toString();
    console.log(JSON.stringify(data));
    Control.connection.pubsub.publish(
      Control.admin_jid,
      Control.pubsub_server,
      Config.PUBSUB_NODE,
      [JSON.stringify(data)],
      Control.on_send
    );
  },

  // initialiser
  init: function () {
    Control.connection.send($pres());
    var _p = $('#publish');
    _p.fadeIn();

    _p.click(function(event) {
      event.preventDefault();

      var _obj = {
        'message' : $('textarea').val(),
        'type'    : MessageType[$('input:radio:checked').val()]
      }

      Control.publish(_obj);    
    });

    return false;
  },

  // called when we have either created a node
  // or the one we're creating is available
  on_create_node: function (data) {
    Control.feedback('Connected', '#00FF00');
    Control.init();
  },

  getUserCredentials: function(){
    this.admin_jid = prompt("Username");
    this.admin_pass = prompt("Password");
  },
  on_subscribe_event :function(msg){
    var elements = msg.getElementsByTagName('entry');
    for(var i =0 ; i < elements.length; i++){
      console.log(elements[i].textContent);
      window.testMessage = elements[i].textContent;

    }
    console.log("Message Received",msg);
    return true;
  },
  on_subscribe : function(sub){
    console.log("======> Succcessfully Subscibed");
    return true;
  },
  subscribe:function(){
    console.log("====> Subscribing");
    Control.connection.pubsub.subscribe(
      Control.admin_jid,
      'pubsub.' + Config.XMPP_SERVER,
      Config.PUBSUB_NODE,
      [],
      Control.on_subscribe_event,
      Control.on_subscribe
    );
  }
}

$(document).ready(function () {
  Control.log('Ready to go...');
  $(document).trigger('connect');
});

// this does the initial connection to the XMPP server
$(document).bind('connect', function () {
  Control.getUserCredentials();

  var conn = new Strophe.Connection(Config.BOSH_SERVICE);
  Control.connection = conn;
  Control.connection.rawInput = Control.raw_input;
  Control.connection.rawOutput = Control.raw_output;
  //Control.connection.addHandler(Control.on_result, null, "message", null, null);
  Control.connection.connect(
    Control.admin_jid, Control.admin_pass, function (status) {
      if (status == Strophe.Status.CONNECTING) {
        Control.log('Connecting...');
        Control.feedback('Connecting... (1 of 2)', '#009900');
      } else if (status == Strophe.Status.CONNFAIL) {
        Control.log('Failed to connect!');
        Control.feedback('Connection failed', '#FF0000');
      } else if (status == Strophe.Status.DISCONNECTING) {
        Control.log('Disconnecting...');
        Control.feedback('Disconnecting...', '#CC6600');
      } else if (status == Strophe.Status.DISCONNECTED) {
        Control.log('Disconnected');
        Control.feedback('Disconnected', '#aa0000');
        $(document).trigger('disconnected');
      } else if (status == Strophe.Status.CONNECTED) {
        $(document).trigger('connected');
      }
    }
  );
});

$(document).bind('connected', function () {
  Control.feedback('Connecting... (2 of 3)', '#00CC00');
  // Control.on_create_node();
  // Control.subscribe();

  // first we make sure the pubsub node exists
  // buy trying to create it again
  console.log("Creating Node==============>");
  Control.connection.pubsub.createNode(
    Control.admin_jid,
    Control.pubsub_server,
    Config.PUBSUB_NODE,
    {
      "pubsub#persist_items": "0",
      "pubsub#notify_retract": "0",
      "pubsub#notify_sub": "0",
      "pubsub#notify_config":"0",
      "pubsub#presence_based_delivery": "0",
      "pubsub#max_items": "0",
      "pubsub#send_last_published_item": "never"
    },
    Control.on_create_node
  );
});

$(document).bind('disconnected', function () {
  Control.log('Disconnected, goodbye');
  Control.feedback('Disconnected', '#dd0000');
});

