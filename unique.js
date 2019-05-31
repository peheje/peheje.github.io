// --- MAIN ---

q("#find-duplicates-btn").addEventListener("click", function(){
    
    var orig = strToList(q("#original").value);
    q("#original-count").textContent = orig.length;

    var unique = listToDic(orig);
    if ("" in unique) {
        delete unique[""]
    }

    var uniqueList = dicToList(unique);
    q("#unique").value = listToStr(uniqueList);
    q("#unique-count").textContent = uniqueList.length;
    var duplicatesList = duplicates(orig);
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