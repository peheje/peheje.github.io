// --- MAIN ---

q("#find-duplicates-btn").addEventListener("click", function(){
    
    var a = strToList(q("#original").value);
    a = a.filter(function(v) { return v.trim() !== ""; });

    q("#original").value = listToStr(a);
    q("#original-count").textContent = a.length;

    var unique = listToDic(a);
    if ("" in unique) {
        delete unique[""]
    }

    var uniqueList = dicToList(unique);
    q("#unique").value = listToStr(uniqueList);
    q("#unique-count").textContent = uniqueList.length;
    var duplicatesList = duplicates(a);
    q("#duplicates").value = listToStr(duplicatesList);
    q("#duplicates-count").textContent = duplicatesList.length;
});

// --- FUNCTIONS ---

function duplicates(list) {
    var o = {};
    var duplicates = [];
    for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (o[item]) {
            duplicates.push(item);
        }
        o[item] = item;
    }
    return duplicates;
}