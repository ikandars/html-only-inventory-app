$(function(){

    var db = new Dexie('MyStore');

    db.version(1).stores({
    	items: '++id,title,category,quantity,*messageWords,image',
        category: '++id,&title'
    });

    // Add hooks that will index "message" for full-text search:
    db.items.hook("creating", function (primKey, obj, trans) {
        if (typeof obj.title == 'string') obj.messageWords = getAllWords(obj.title);
    });
    db.items.hook("updating", function (mods, primKey, obj, trans) {
        if (mods.hasOwnProperty("title")) {
            // "message" property is being updated
            if (typeof mods.title == 'string')
                // "message" property was updated to another valid value. Re-index messageWords:
                return { messageWords: getAllWords(mods.title) };
            else
                // "message" property was deleted (typeof mods.message === 'undefined') or changed to an unknown type. Remove indexes:
                return { messageWords: [] };
        }

    });
    function getAllWords(text) {
        /// <param name="text" type="String"></param>
        var allWordsIncludingDups = text.split(' ');
        var wordSet = allWordsIncludingDups.reduce(function (prev, current) {
            prev[current] = true;
            return prev;
        }, {});
        return Object.keys(wordSet);
    }

    // Open the database
    db.open().catch(function(error){
    	console.log('Uh oh : ' + error);
    });

    $.fn.serializeObject = function()
    {
       var o = {};
       var a = this.serializeArray();
       $.each(a, function() {
           if (o[this.name]) {
               if (!o[this.name].push) {
                   o[this.name] = [o[this.name]];
               }
               o[this.name].push(this.value || '');
           } else {
               o[this.name] = this.value || '';
           }
       });
       return o;
    };

    var file;
    $('#image').change(function(){

        file = this.files[0];
        var imageType = /^image\//;

        if (!imageType.test(file.type)) {
            alert('Ini bukan file image');
        }

        var img = $('<img/>');
        $('a.thumbnail').show().empty().append(img);

        var reader = new FileReader();
        reader.onload = (function(aImg) {
            return function(e) {
                aImg.attr('src', e.target.result);
            };
        })(img);
        reader.readAsDataURL(file);
    });

    var _vals = [];

    $('#allchck').change(function(){
        $('td > input').prop('checked', this.checked);

        $('tr > td > input').each(function(){

            var id = parseInt($(this).attr('id-item'));

            if ($(this).is(':checked')){
                _vals.push(id);
            }
            else {
                var index = _vals.indexOf(id);
                _vals.splice(index, 1);
            }
        });

        if(_vals.length){
            $('.btn-danger').show();
        }
        else {
            $('.btn-danger').hide();
        }
    });

    $('.col-md-4').on('click', '.btn-danger', function(){
        if(_vals.length){
            if(confirm('Hapus data ini?')) {

                $('tr > td > input').each(function(){

                    var id = parseInt($(this).attr('id-item'));

                    if ($(this).is(':checked')){
                        $(this).closest('tr').remove();
                    }

                });
                console.log(_vals);
                db.items.bulkDelete(_vals);
                _vals = [];
                $('.btn-danger').hide();
            }
        }
        else {
            alert('tidak ada data yang bisa dihapus.');
        }
    });

    $('tbody').not('#allchck').on('change', 'input[type="checkbox"]', function(){

        var id = parseInt($(this).attr('id-item'));

        if ($(this).is(':checked')){
            _vals.push(id);
        }
        else {
            var index = _vals.indexOf(id);
            _vals.splice(index, 1);
        }

        if(_vals.length){
            $('.btn-danger').show();
        }
        else {
            $('.btn-danger').hide();
        }
    });

    $('#add-item').submit(function(){
        var data = $(this).serializeObject();

        if(file){
            data.image = file;
        }

        db.items.add(data);
        data.id = 999;
        $.appendData(data, 'prepend');
        $('#exampleModal').modal('hide');
        $('a.thumbnail').hide().empty();

        this.reset();

        return false;
    });

    $('input[type="search"]').keyup(function(){
        db.items.where("messageWords").startsWithIgnoreCase(this.value).distinct().toArray(function (a) {
            $('tbody').empty();
            $.each(a, function(i, v){
                $.appendData(v, 'append');
            });
        });
    });

    $.appendData = function(item, method){
        console.log(item);
        $('tbody')[method](
            $('<tr/>').append(
                $('<td/>').attr({scope:'row'}).append(
                    $('<input/>').attr({type:'checkbox', 'id-item':item.id})
                )
            ).append(
                $('<td/>').html(item.title)
            ).append(
                $('<td/>').html(item.category)
            ).append(
                $('<td/>').html(item.quantity)
            ).append(
                $('<td/>').attr('thumb-id', item.id)
            )
        );

        if(item.image){
            var img = $('<img/>').css({'max-height':'70px', 'max-width':'100px'});
            $('[thumb-id="'+item.id+'"]').append(
                $('<div/>').attr('class', 'row').append(
                    $('<div/>').attr('class', 'col-md-12').append(img)
                )
            );

            var reader = new FileReader();
            reader.onload = (function(aImg) {
                return function(e) {
                    aImg.attr('src', e.target.result);
                };
            })(img);
            reader.readAsDataURL(item.image);
        }
    };

    db.items
        .orderBy("id")
        .reverse()
		.each(function(item){
            $.appendData(item, 'append');
        });

        db.category
    		.where('id')
    		.above(0)
    		.each(function(category){
                $('[name="category"]').append(
                    $('<option/>').text(category.title)
                );
            });

        // db.items.bulkAdd([
        //     {title:"Introduction PHP", category:"Book", quantity:10},
        //     {title:"Introduction Java", category:"Book", quantity:10},
        //     {title:"Introduction Python", category:"Book", quantity:10},
        //     {title:"Introduction Ruby", category:"Book", quantity:10},
        // ]);
        //
        // db.category.bulkAdd([
        //      {title:"Book"},
        //      {title:"Laptop"},
        //      {title:"Bags"},
        //      {title:"Tshirt"}
        //  ]);
});
