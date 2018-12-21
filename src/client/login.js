'use strict';

$(document).ready(function () {

    var validMsisdns = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    $('#form').submit(function (req, res) {
        var name = $('#username').val();
        var msisdn = $('#msisdn').val();
        if (validMsisdns.includes(msisdn) == false) {
            alert("invalid msisdn");
            return false;
        }
        Cookies.set('name', name);
        Cookies.set('msisdn', msisdn);
        window.location.href = "/chat";
        return false;
    });
});