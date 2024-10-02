"use strict";

const URL_PARAMS = new URLSearchParams(window.location.search);
GAMEDATA.catalogue.sort((a, b) => (a.category.toLowerCase() > b.category.toLowerCase())?1:-1);
const TYPEDATA = {
    "source": {name: "Fullscreen", icon: "expand"},
    "unblocked": {name: "Unblocked", icon: "unlock"},
    "scratch": {name: "Scratch", icon: "speakap", icon_brand: true},
    "turbowarp": {name: "Turbowarp", icon: "speakap", icon_brand: true},
    "flasharchive": {name: "Flash Game Archive", icon: "bolt"},
    "ultimategaming": {name: "UltimateGaming", icon: "file-arrow-down"},
    "gameboy": {name: "Gameboy", icon: "gamepad"},
    "collection": {name: "Collection of games", icon: "list-ul"},
    "nosource": {name: "In-browser fullscreen mode not available", icon: "ban"},
    "unauthentic": {name: "Unauthentic game", icon: "triangle-exclamation"},
	"gotd": {name: "Game of the Day", icon: "star"},
};
const AUTOFILL_CONTROLS = {
    "lr": ["Left", "Right", "AD"],
    "jump": ["Up", "W", "Space"],
    "up": ["Up", "W"],
    "down": ["Down", "S"],
    "dirs": ["Arrow keys", "WASD"]
};
const INCLUDE_ULTIMATEGAMING = URL_PARAMS.get("gths") != null;

var reports_left = 3;

// fga storage location - %appdata%\\Macromedia\\Flash Player\\#SharedObjects
// local storage location - %localappdata%\\Google\\Chrome\\User Data\Default\\Local Storage\\leveldb

function button_div(idx, text, cls){
    var btn = document.createElement("div");
    btn.classList = "btn "+cls;
    btn.innerText = text;
    btn.setAttribute("data-index", idx);
    return btn;
}

function make_category_button(n){
    var btn = button_div(n, GAMEDATA.catalogue[n].category, "category");
    btn.onclick = select_category.bind(null, n);
    btn.ondblclick = play_game.bind(null, 0);
    document.querySelector("#categories").appendChild(btn);
    return btn;
}

function make_game_button(cat, name){
    var btn = button_div(name, name || cat.category, "game");
    btn.onclick = select_game.bind(null, name);
    btn.ondblclick = play_game.bind(null, 0);
    document.querySelector("#games").appendChild(btn);
    return btn;
}

function make_play_button(text, n){
    var btn = button_div(n, text, "play");
    btn.onclick = play_game.bind(null, n);
    document.querySelector("#buttons").appendChild(btn);
    return btn;
}

function make_play_label(text){
    var lbl = document.createElement("div");
    lbl.classList = "lbl";
    lbl.innerHTML = text;
    document.querySelector("#buttons").appendChild(lbl);
    return lbl;
}

function make_icon(name, title=null, brand=false){
    var icon = document.createElement("span");
    icon.classList = `fa${brand?"b":"s"} fa-${name}`;
    if (title) icon.title = title;
    return icon;
}

function add_icons(btn, ...icons){
    for (var name of icons){
        if (TYPEDATA[name].icon == null) continue;
        btn.appendChild(make_icon(TYPEDATA[name].icon, TYPEDATA[name].name, TYPEDATA[name].icon_brand));
    }
}

function get_groups(n){
    var cat = GAMEDATA.catalogue[n];
    var groups = {};
    for (var game of cat.games){
        if (!INCLUDE_ULTIMATEGAMING && game.type == "ultimategaming") continue;
        var name = game.name;
        if (name == null){
            if (["flasharchive", "ultimategaming"].includes(game.type)) name = TYPEDATA[game.type].name;
            else name = "";
        } else if (!isNaN(name)) name += " ";
        if (!(name in groups)) groups[name] = [];
        groups[name].push({...game, name: game.name ?? game.category});
    }
    return [cat, groups];
}

function refresh_main(deselect=false){
    var sel = document.querySelector(".category.selected");
    if (sel != null) sel = sel.getAttribute("data-index");
    document.querySelector("#categories").innerHTML = "";
    if (deselect){
        document.querySelector("#games").innerHTML = "";
        document.querySelector("#buttons").innerHTML = "";
        document.querySelector("#gamename").innerText = "";
    }
    var search = document.querySelector("#search").value.toLowerCase();
    document.querySelector("#clearsearch").style.display = (search == "") ? "none" : "";
    for (var n = 0; n < GAMEDATA.catalogue.length; n++){
        var cat = GAMEDATA.catalogue[n];
        if (search){
            var ok = true;
            for (var sub of search.split(", ")){
                if (!(
                        cat.category.toLowerCase().includes(sub) ||
                        (cat.tags && cat.tags.find(el => el.toLowerCase().includes(sub))) ||
                        cat.games.find(el => el.type.toLowerCase().includes(sub))
                    )){
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;
        }
        var icons = [];
        if (Object.keys(get_groups(n)[1]).length >= 4) icons.push("collection");
        var ok = false;
        for (var game of cat.games){
            if (["source", "scratch", "turbowarp", "gameboy"].includes(game.type)){
                ok = true;
                break;
            }
        }
        if (!ok) icons.push("nosource");
        if (INCLUDE_ULTIMATEGAMING){
            for (var game of cat.games){
                if (game.type == "ultimategaming"){
                    icons.push("ultimategaming");
                    break;
                }
            }
        }
        if (cat.unauthentic && !icons.includes("ultimategaming")) icons.push("unauthentic");
        var el = make_category_button(n);
        add_icons(el, ...icons);
        if (sel != null && !deselect && el.getAttribute("data-index") == sel) el.classList.add("selected");
    }
}

function select_category(n){
    var els = document.querySelectorAll(".category");
    for (var i = 0; i < els.length; i++){
        if (els[i].getAttribute("data-index") == n) els[i].classList.add("selected");
        else els[i].classList.remove("selected");
    }
    var [cat, groups] = get_groups(n);
    var gamesdiv = document.querySelector("#games");
    gamesdiv.innerHTML = "";
    gamesdiv.style.width = "50%";
    var gamename = document.querySelector("#gamename");
    gamename.innerText = cat.category;
    gamename.classList.remove("big");
    for (var name of Object.keys(groups)){
        var icons = [];
        for (var game of groups[name]){
            if (!icons.includes(game.type)) icons.push(game.type);
        }
        add_icons(make_game_button(cat, name), ...icons);
    }
    if (!("" in groups) || Object.keys(groups).length > 1) gamesdiv.style.display = "";
    else gamesdiv.style.display = "none";
    sticky_panel();
    select_game(Object.keys(groups)[0]);
}

function select_game(n){
    var els = document.querySelectorAll(".game");
    for (var i = 0; i < els.length; i++){
        if (els[i].getAttribute("data-index") == n) els[i].classList.add("selected");
        else els[i].classList.remove("selected");
    }
    var sel = document.querySelector(".category.selected");
    if (sel == null){
        return;
    }
    var catnum = sel.getAttribute("data-index");
    var [cat, groups] = get_groups(catnum);
    var btnsdiv = document.querySelector("#buttons");
    btnsdiv.innerHTML = "";
    var gamesdiv = document.querySelector("#games");
    for (i = 0; i < groups[n].length; i++){
        var game = groups[n][i];
        if (game.type == "flasharchive"){
            make_play_label("This content is available through the Flash Game Archive.");
            make_play_label(`Search term: "${game.searchterm}"`);
            add_icons(make_play_button("Launch the Archive", i), "flasharchive");
            make_play_button("Download the Archive", "http://www.flashgamearchive.com/download-fga-software/");
            make_play_label("If you have downloaded the archive but the launch button does not work, run <a href=\"fga_protocol.py\""+
                " download>this program</a> (Windows only) and try again.")
        } else if (game.type == "ultimategaming"){
            make_play_label("This content is available for download. Launch UltimateGaming on your computer and download it from there.");
            make_play_label(`Game name: "${game.ugname ?? game.name}"`);
        } else {
            add_icons(make_play_button("Play: "+(TYPEDATA[game.type].name ?? game.type), i), game.type);
        }
    }
    if (gamesdiv.querySelector("#tags") == null){ // tag elements not yet generated
        var tagdiv = document.createElement("div");
        tagdiv.id = "tags";
        var icon = make_icon("link");
        icon.classList.add("link");
        icon.onclick = redirect_to_selection.bind(null, true);
        icon.title = "Copy link to this game";
        tagdiv.appendChild(icon);
        var icon = make_icon("flag");
        icon.classList.add("report");
        icon.title = "Report a broken game";
        icon.onclick = report_issue;
        tagdiv.appendChild(icon);
        var tags = GAMEDATA.catalogue[catnum].tags;
        if (tags){
            tags = [...tags];
            tags.sort((a, b) => (a.toLowerCase() > b.toLowerCase())?1:-1);
            tagdiv.appendChild(make_icon("tag"));
            for (i = 0; i < tags.length; i++){
                var tag = document.createElement("span");
                tag.classList = "tag";
                tag.innerText = tags[i];
                tag.onclick = search_tag.bind(null, tags[i]);
                tagdiv.appendChild(tag);
            }
        }
        if (gamesdiv.style.display == "none") btnsdiv.appendChild(tagdiv);
        else gamesdiv.appendChild(tagdiv);
        if (cat.controls){
            var det = document.createElement("details");
            det.classList = "lbl";
            var sum = document.createElement("summary");
            sum.innerText = "Show controls";
            det.appendChild(sum);
            var ul = document.createElement("ul");
            ul.style.listStyle = "none";
			ul.style.padding = "0px";
            for (var k of Object.keys(cat.controls)){
                var v = cat.controls[k];
                if (typeof v == "string" && v[0] == "_") v = AUTOFILL_CONTROLS[v.slice(1)];
                if (typeof v == "object") v = [...v].join(", ");
                var li = document.createElement("li");
                li.innerText = `${k} - ${v}`;
                ul.appendChild(li);
            }
            if (cat.games.find(el => el.type == "gameboy")){
                var li = document.createElement("li");
                var lbl = document.createElement("a");
                lbl.innerText = "Gameboy controls";
                lbl.onclick = function(){
                    display_content("Help", "help");
                }
                li.appendChild(lbl);
                ul.appendChild(li);
            }
            det.appendChild(ul);
            if (gamesdiv.style.display == "none") btnsdiv.appendChild(det);
            else gamesdiv.appendChild(det);
        }
    }
}

function get_selected_game(n){
    var groups = get_groups(document.querySelector(".category.selected").getAttribute("data-index"))[1];
    var game = groups[document.querySelector(".game.selected").getAttribute("data-index")];
    if (typeof n == "number") game = game[n];
    else game = game.find(el => el.name == n);
    return game;
}

function open_tab(url, embed){
	if (URL_PARAMS.get("singletab") != null){
		window.location.replace(url);
	} else if (embed){
		var win = window.open();
		win.document.body.style.margin = "0";
		win.document.body.style.height = "100vh";
		var iframe = win.document.createElement("iframe");
		iframe.style.border = "none";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.style.margin = "0";
		iframe.src = url;
		win.document.body.appendChild(iframe);
	} else {
		window.open(url, "_blank").focus();
	}
}

function play_game(n){
    if (typeof n == "string"){
        open_tab(n, false);
        return;
    }
    var game = get_selected_game(n);
    if (game.type == "ultimategaming") return;
    if (game.type == "flasharchive"){
        window.open("flasharchive://");
    } else {
        var link = game.link;
        if (game.type == "scratch") link = `https://scratch.mit.edu/projects/${game.id}/fullscreen`;
        else if (game.type == "turbowarp") link = `https://turbowarp.org/${game.id}/fullscreen`;
        else if (game.type == "gameboy"){
            link = `https://professordragon.github.io/gameboy/?name=${game.id}&src=`;
            if (game.forcealt) link += "https://mkgamesdev.github.io/MKGBA2.0/";
            else link += "https://picklekid31.github.io/GBA-unblocked-games/";
        }
        open_tab(link, (game.type == "source" || game.type == "gameboy") && !game.noembed);
    }
}

function redirect_to_selection(copy=false){
    var cat = GAMEDATA.catalogue[document.querySelector(".category.selected").getAttribute("data-index")];
    var game = document.querySelector(".game.selected").getAttribute("data-index");
    URL_PARAMS.set("cat", cat.category);
    if (game != ""){
        URL_PARAMS.set("game", game);
    } else {
        URL_PARAMS.delete("game");
    }
    window.history.pushState({}, "", "?"+URL_PARAMS.toString());
    if (copy){
        navigator.clipboard.writeText(window.location.href);
    }
}

function report_issue(){
    var catnum = document.querySelector(".category.selected").getAttribute("data-index");
    var cat = GAMEDATA.catalogue[catnum];
    var game = document.querySelector(".game.selected").getAttribute("data-index");
    display_content("Report a broken game", "report");
    document.querySelector("#reportcategory").value = cat.category;
    document.querySelector("#reportgame").value = game;
    document.querySelector("#reportbtn").onclick = function(){
        if (reports_left > 0){
            reports_left--;
            var term = cat.category;
            if (game != ""){
                term += ": "+game;
            }
            fetch("report.php", {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: new URLSearchParams({
                    term: term
                }).toString()
            });
        }
        display_content("News", "news");
    };
    document.querySelector("#reportcancelbtn").onclick = function(){
        select_category(catnum);
        select_game(game);
    };
}

function sticky_panel(){
    var ofs = document.querySelector("#gamename").classList.contains("big") ? 0 : (window.pageYOffset-114);
    document.querySelector("#sticky").style.top = Math.max(ofs, 0)+"px";
}

function jump_to_search(select=true){
    var searchbox = document.querySelector("#search");
    // window.scrollBy(0, Math.min(searchbox.getBoundingClientRect().y-10, 0));
    window.scrollTo(0, 0);
    if (select){
        searchbox.focus();
        searchbox.select();
    }
    return searchbox;
}

function clear_search(focus=false){
    var searchbox = document.querySelector("#search");
    searchbox.value = "";
    refresh_main();
    if (focus) searchbox.focus();
}

function search_tag(name){
    jump_to_search(false).value = name;
    refresh_main();
}

function mask_tab(){
    var icon = document.querySelector("link[rel=icon]");
    if (document.visibilityState == "visible"){
        document.title = "Unblocked Games Hub";
        icon.href = "thumbs/logo.ico";
    } else {
        icon.href = "thumbs/drive.ico";
        if (URL_PARAMS.get("noredirect") == null){
            document.title = "Google Drive";
            window.location.replace("https://drive.google.com/drive/my-drive");
        } else {
            document.title = "My Drive - Google Drive";
        }
    }
}

function display_content(title, id){
    refresh_main(true);
    var gamesdiv = document.querySelector("#games");
    gamesdiv.style.width = "100%";
    gamesdiv.style.display = "";
    var gamename = document.querySelector("#gamename");
    gamename.innerText = title;
    gamename.classList.add("big");
    var news = document.querySelector("#"+id).cloneNode(true);
    news.id = "newsdisp";
    news.style.display = "block";
    gamesdiv.appendChild(news);
    window.scrollTo(0, 0);
}

function random_game(){
    var n = Math.floor(Math.random()*GAMEDATA.catalogue.length);
    select_category(n);
}

function category_link(link){
    if (typeof link == "object") link = link.innerText;
    link = link.toLowerCase();
    var n = GAMEDATA.catalogue.findIndex(el => el.category.toLowerCase() == link);
    if (n > -1) select_category(n);
}

function key_pressed(e){
    if (e.key == "Escape") clear_search();
    else if (document.activeElement.tagName != "INPUT"){
        if (e.key == "/"){
            jump_to_search();
            e.preventDefault();
        }
    }
}

function init_main(){
    var searchbox = document.querySelector("#search");
    searchbox.value = URL_PARAMS.get("search");
    searchbox.focus();
    refresh_main();
    if (URL_PARAMS.get("cat")){
        select_category(GAMEDATA.catalogue.findIndex(el => el.category == URL_PARAMS.get("cat")));
        if (URL_PARAMS.get("game")) select_game(URL_PARAMS.get("game"));
    } else {
        display_content("News", "news");
    }
}

document.body.onload = init_main;
document.body.onscroll = sticky_panel;
document.body.onkeydown = key_pressed;
// document.onvisibilitychange = mask_tab;
