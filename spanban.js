function spanban(settings) {

	if (!settings || !settings.url || !settings.targetId) {
		throw new Error('spanban requires passing the settings object with valid "url" and "targetId" properties');
	}

	$.ajax(settings.url, {
		headers: {
			'accept': 'application/json;odata=verbose',
			'content-type': 'application/json;odata=verbose'
		}
	})
	.done(function(data) {
		var columns = getKanbanColumns(data, settings);
		displayKanbanColumns(columns, settings);
		
		if (settings.listUrl || settings.newItemUrl || settings.showRefresh || settings.showFilter) {
			prependSpanbanControls(settings, columns);
		}
		
		if (settings.filterOutCssClasses) {
			filterOutCssClasses(settings.filterOutCssClasses);
			toggleItemVisibilityByClass();
		}
		
		if (settings.done && $.isFunction(settings.done)) {
			settings.done();
		}
	})
	.fail(function(errorThrown) {
		if (settings.fail && $.isFunction(settings.fail)) {
			settings.fail();
		}
	})
	.always(function() {
		if (settings.always && $.isFunction(settings.always)) {
			settings.always();
		}
	});
}


function filterOutCssClasses(cssClasses) {
	var filterCheckBoxes = document.querySelectorAll('#tableFilter input[type=checkbox]');
	for (var i = 0; i < filterCheckBoxes.length; i++) {
		if (cssClasses.indexOf(filterCheckBoxes[i].value) >= 0) {
			filterCheckBoxes[i].checked = false;
		}
	}
}


function prependSpanbanControls(settings, columns) {
	var containingElement = document.getElementById(settings.targetId);
	var divControls = document.createElement('div');
	divControls.setAttribute('id', 'divSpanbanControls');
	
	if (settings.showRefresh) {
		var refreshLink = document.createElement('a');
		refreshLink.setAttribute('class', 'refresh');
		refreshLink.innerHTML = 'Refresh';
		divControls.appendChild(refreshLink);
		refreshLink.addEventListener('click', function() { 
			var progress = document.createElement('progress');
			refreshLink.parentNode.replaceChild(progress, refreshLink);
			settings.filterOutCssClasses = getFilteredOutCssClasses();
			spanban(settings); 
		}, false);
	}
	
	if (settings.listUrl) {
		var editItemLink = document.createElement('a');
		editItemLink.setAttribute('class', 'sharepoint');
		editItemLink.setAttribute('href', settings.listUrl);
		editItemLink.innerHTML = 'SharePoint List';
		divControls.appendChild(editItemLink);
	}
	
	if (settings.newItemUrl) {
		var newItemLink = document.createElement('a');
		newItemLink.setAttribute('class', 'add');
		newItemLink.setAttribute('href', settings.newItemUrl);
		newItemLink.innerHTML = 'Create New Item';
		divControls.appendChild(newItemLink);
	}
	
	if (settings.showFilter) {
		createFilter(columns, containingElement);
		var filterLink = document.createElement('a');
		filterLink.addEventListener('click', toggleFilter, false);
		filterLink.setAttribute('class', 'filter');
		filterLink.innerHTML = 'Toggle Filter';
		divControls.appendChild(filterLink);
	}
	
	containingElement.insertBefore(divControls, containingElement.firstChild);
}


function getFilteredOutCssClasses() {
	var filteredOutCssClasses = [];
	var checkboxes = document.querySelectorAll('#tableFilter input[type=checkbox]');
	for (var i = 0; i < checkboxes.length; i++) {
		if (!checkboxes[i].checked) {
			filteredOutCssClasses.push(checkboxes[i].value);
		}
	}
	return filteredOutCssClasses;
}


function getKanbanColumns(data, settings) {
	
	var idField = 'ID';
	var rankField = 'Rank';
	var titleField = 'Title';
	var statusField = 'Status';
	var classFields = [];
	
	if (settings && settings.idField) idField = settings.idField;
	if (settings && settings.rankField) rankField = settings.rankField;
	if (settings && settings.titleField) titleField = settings.titleField;
	if (settings && settings.statusField) statusField = settings.statusField;
	if (settings && settings.classFields) classFields = settings.classFields;

	var columns = {};
	for (var i = 0; i < data.d.results.length; i++) {
		var item = data.d.results[i];
		var columnId = legalizeString(item[statusField]);
		if (!columns[columnId]) {
			columns[columnId] = { name: item[statusField], items: [] };
		}
		
		var kanbanitem = {
			id : item[idField],
			title : item[titleField],
			rank : item[rankField] ? item[rankField] : '?',
			status : item[statusField],
			classes : []
		};
		
		for (var j = 0; j < classFields.length; j++) {
			kanbanitem.classes.push({ name: classFields[j], value: item[classFields[j]], cssClass: legalizeString(item[classFields[j]]) });
		}
		
		columns[columnId].items.push(kanbanitem); 
	}
	
	return columns;
}


function displayKanbanColumns(columns, settings) {
	var thead = document.createElement('thead');
	var theadtr = document.createElement('tr');
	thead.appendChild(theadtr);
	
	var tbody = document.createElement('tbody');
	var tbodytr = document.createElement('tr');
	tbody.appendChild(tbodytr);
	
	var column;
	
	for (var prop in columns) {
		column = columns[prop];
		var colClass = legalizeString(column.name);
		
		var th = document.createElement('th');
		th.setAttribute('class', colClass);
		th.appendChild(document.createTextNode(column.name));
		theadtr.appendChild(th);
		
		var td = document.createElement('td');
		td.setAttribute('class', colClass);
		
		for (var i = 0; i < column.items.length; i++) {
			var item = column.items[i];
			var classList = 'kanbanitem';
			
			for (var j = 0; j < column.items[i].classes.length; j++) {
				classList += ' ' + column.items[i].classes[j].cssClass;
			}
			
			var link = document.createElement('a');
			link.setAttribute('class', classList);
			link.appendChild(document.createTextNode(item.id + ' (' + item.rank + ') ' + item.title));
			td.appendChild(link);
		}
		
		tbodytr.appendChild(td);
	}
	var table = document.createElement('table');
	table.setAttribute('id', 'tableSpanban');
	table.setAttribute('class', 'spanban');
	table.appendChild(thead);
	table.appendChild(tbody);
	var containingElement = document.getElementById(settings.targetId);
	
	while (containingElement.firstChild) {
		containingElement.removeChild(containingElement.firstChild);
	}
	
	containingElement.appendChild(table);
}


function legalizeString(value) {
	var legalized = '';
	
	for (var i = 0; i < value.length; i++) {
		if (value.charAt(i).match(/[0-9a-zA-Z]/g)) {
			legalized += value.charAt(i);
		}
	}
	
	return legalized;
}


function createFilter(columns, containingElement) {
	var divFilter = document.createElement('div');
	divFilter.setAttribute('id', 'divFilter');
	divFilter.setAttribute('style', 'display: none;');
	
	var tableFilter = document.createElement('table');
	tableFilter.setAttribute('id', 'tableFilter');
	tableFilter.setAttribute('class', 'spanban');
	var tr = document.createElement('tr');
	tableFilter.appendChild(tr);
	divFilter.appendChild(tableFilter);
	
	var tableColumns = [];
	
	for (var prop in columns) {
		var column = columns[prop];
		for (var i = 0; i < column.items.length; i++) {
			for (var j = 0; j < column.items[i].classes.length; j++) {
				var classInfo = column.items[i].classes[j];
				
				if (!(classInfo.name in tableColumns)) {
					td = document.createElement('td');
					td.appendChild(createFilterAllNoneDiv());
					tr.appendChild(td);
					tableColumns[classInfo.name] = { element: td, items: [] };
				}
				
				if (tableColumns[classInfo.name].items.indexOf(classInfo.cssClass) < 0) {
					var kanbanitem = document.createElement('a');
					kanbanitem.setAttribute('class', 'kanbanitem ' + classInfo.cssClass);
					var chk = document.createElement('input');
					var chkId = 'chk' + classInfo.name + classInfo.cssClass;
					chk.setAttribute('id', chkId);
					chk.setAttribute('type', 'checkbox');
					chk.setAttribute('checked', 'checked');
					chk.setAttribute('value', classInfo.cssClass);
					chk.addEventListener('click', toggleItemVisibilityByClass);
					kanbanitem.appendChild(chk);
					var label = document.createElement('label');
					label.setAttribute('for', chkId);
					label.innerHTML = classInfo.value;
					kanbanitem.appendChild(label);
					
					tableColumns[classInfo.name].element.appendChild(kanbanitem);
					tableColumns[classInfo.name].items.push(classInfo.cssClass);
				}
			}
		}
	}
	
	containingElement.insertBefore(divFilter, containingElement.firstChild);
}


function createFilterAllNoneDiv() {
	var div = document.createElement('div');
	var all = document.createElement('a');
	all.appendChild(document.createTextNode('All'));
	all.addEventListener('click', function() {
		var td;
		while (!td || td.tagName.toLowerCase() != 'td') {
			if (!td) td = this;
			td = td.parentNode;
		}
		
		var chks = td.querySelectorAll('input[type=checkbox]');
		for (var i = 0; i < chks.length; i++) {
			chks[i].checked = true;
		}
		
		toggleItemVisibilityByClass();
	});
	div.appendChild(all);
	var none = document.createElement('a');
	none.appendChild(document.createTextNode('None'));
	none.addEventListener('click', function() {
		var td;
		while (!td || td.tagName.toLowerCase() != 'td') {
			if (!td) td = this;
			td = td.parentNode;
		}
		
		var chks = td.querySelectorAll('input[type=checkbox]');
		for (var i = 0; i < chks.length; i++) {
			chks[i].checked = false;
		}
		
		toggleItemVisibilityByClass();
	});
	div.appendChild(none);
	return div;
}


function toggleFilter() {
	var filter = document.getElementById('divFilter');
	var style = filter.getAttribute('style');
	if (style && style.match(/display:\s?none;?/g)) {
		filter.setAttribute('style', style.replace(/display:\s?none;?/g, ''));
	} else {
		filter.setAttribute('style', 'display:none; ' + style);
	}
}


function toggleItemVisibilityByClass() {	
	
	var hiddenClasses = [];
	var checkboxNodeList = document.querySelectorAll('#tableFilter input[type=checkbox]');
	for (var i = 0; i < checkboxNodeList.length; i++) {
		if (!checkboxNodeList[i].checked) {
			if (checkboxNodeList[i].value.match(/^[0-9]/)) {
				hiddenClasses.push('\\3' + checkboxNodeList[i].value.charAt(0) + ' ' + checkboxNodeList[i].value.substr(1));
			} else {
				hiddenClasses.push(checkboxNodeList[i].value);
			}
		}
	}

	var styleElement = document.getElementById('styleSpanbanFilter');
	if (!styleElement) {
		var styleElement = document.createElement('style');
		styleElement.setAttribute('id', 'styleSpanbanFilter');
		document.head.appendChild(styleElement);
	}
	
	if (hiddenClasses.length == 0) {
		styleElement.innerHTML = '';
	} else {
		styleElement.innerHTML = '#tableSpanban .' + hiddenClasses.join(', #tableSpanban .') + ' { display: none; }';
	}
}