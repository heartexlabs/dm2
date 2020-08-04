
import keymaster from "keymaster";
import { types, getEnv, getParent, clone, getSnapshot, destroy, getRoot } from "mobx-state-tree";

import TasksStore from "./TasksStore";
import LabelOpsStore from "./LabelOpsStore";
import { guidGenerator } from "../utils/random";
import fields, { labelingFields } from "../data/fields";

import { StringFilter, NumberFilter, 
    BetweenNumberFilter } from "./FiltersStore";

const Field = types
      .model("Fields", {
          field: types.string,
          
          enabled: true,
          canToggle: false,
          
          source: types.optional(types.enumeration(["tasks", "annotations", "inputs"]), "tasks"),
          
          filterState: types.maybeNull(types.union({ eager: false }, StringFilter, NumberFilter, BetweenNumberFilter))
      }).views(self => ({
          get key() { return self.source + "_" + self.field; },
      }))
      .actions(self => ({
          toggle() {
              self.enabled = !self.enabled;
          },
      }));

const View = types
      .model("View", {
          id: types.optional(types.identifier, () => { return guidGenerator(5) }),
          
          title: "Tasks",
          
          type: types.optional(types.enumeration(["list", "grid"]), "list"),
          target: types.optional(types.enumeration(["tasks", "annotations"]), "tasks"),
          
          fields: types.array(Field),
          
          enableFilters: false,
          renameMode: false,
      }).views(self => ({
          get key() { return self.id },

          get root() { return getRoot(self) },
          
          get parent() { return getParent(getParent(self)) },

          get dataFields() {
            return self.fields.filter(f => f.source === "inputs").map(f => f.field);
          },

          get hasDataFields() {
              return self.dataFields.length > 0;
          },
          
          fieldsSource(source) {
              return self.fields.filter(f => f.source === source);
          },

          // get fields formatted as columns structure for react-table
          get fieldsAsColumns() {
              let lst
              // if (self.root.mode === "label") lst = self.fields.filter(f => f.source === 'label');
              // else
              if (self.target === "tasks") lst = self.fields.filter(f => f.source !== "annotations");
              else lst = self.fields.filter(f => f.source !== "tasks");

              return lst
                .filter(f => f.enabled && (self.root.mode !== "label" || labelingFields.includes(f.field) || f.source === "inputs"))
                .map(f => {
                  const field = fields(f.field);
                  const { id, accessor, Cell, filterClass, filterType } = field;
                  
                  const cols = {
                      Header: field.title,
                      accessor,
                      disableFilters: true,
                      _filterState: f.filterState
                  };

                  if (Cell) cols.Cell = Cell;
                  if (id) cols.id = id;

                  if (self.enableFilters === true) {
                      if (filterClass !== undefined)
                          cols["Filter"] = filterClass;
                      
                      if (filterType !== undefined) 
                          cols["filter"] = filterType

                      if (filterType || filterClass)
                          cols["disableFilters"] = false;                      
                  }

                  return cols;
              })
          }
      })).actions(self => ({
          setType(type) {
              self.type = type;
          },

          setTarget(target) {
              self.target = target;
          },
          
          setTitle(title) {
              self.title = title;
          },

          setRenameMode(mode) {
              self.renameMode = mode;
          },
          
          toggleFilters() {
              self.enableFilters = ! self.enableFilters;
          },

          afterAttach() {
              if (! self.hasDataFields) {
                  // create data fields if they were not initialized
                  const fields = self.root.tasksStore.getDataFields();
                  
                  self.fields = [
                      ...self.fields,
                      ...fields.map(f => {
                          return Field.create({
                              field: f,
                              canToggle: true,
                              enabled: false,
                              source: 'inputs',
                              filterState: { stringValue: "" }
                          });
                      })
                  ];
              }
          }
      }))

const ViewsStore = types
      .model("ViewsStore", {
          selected: types.safeReference(View),
          views: types.array(View),
      }).views(self => ({
          get all() {
              return self.views;
          },

          get canClose() {
              return self.all.length > 1;
          }
      })).actions(self => ({
          setSelected(view) {
              self.selected = view;
          },

          deleteView(view) {
              let needsNewSelected = false;
              if (self.selected === view)
                  needsNewSelected = true;
              
              destroy(view);
              
              if (needsNewSelected)
                  self.setSelected(self.views[0]);              
          },

          addView() {
              const dupView = getSnapshot(self.views[0]);
              const newView = View.create({
                  fields: dupView.fields
              });

              self.views.push(newView);
              self.setSelected(newView);
              
              return newView;
          },
          
          duplicateView(view) {
              const dupView = getSnapshot(view);
              const newView = View.create({
                  ...dupView,
                  id: guidGenerator(5),
                  title: dupView.title + " copy"
              });
              
              self.views.push(newView);
              self.setSelected(self.views[self.views.length - 1]);
          },

          afterCreate() {
              if (! self.selected) {
                  self.setSelected(self.views[0]);
              }
          }
    }));

export default types
    .model("dmAppStore", {
        mode: types.optional(types.enumeration(["dm", "label-table", "label-ops"]), "dm"),
        selectedCount: 0,
        
        tasksStore: types.optional(TasksStore, {}),
        
        viewsStore: types.optional(ViewsStore, {
            views: []            
        }),

        operationsStore: types.optional(LabelOpsStore, {
            operations: [
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[project...Feature Request]",
                          "id": 0,
                          "lopLabel": "Feature Request",
                          "source": "heartex",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[the coordinates...Feature Request]",
                          "id": 1,
                          "lopLabel": "Feature Request",
                          "source": "heartex",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[coordinates...Feature Request]",
                          "id": 2,
                          "lopLabel": "Feature Request",
                          "source": "heartex",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[to the...Issue]",
                          "id": 3,
                          "lopLabel": "Issue",
                          "source": "heartex",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[happened the screen...Issue]",
                          "id": 4,
                          "lopLabel": "Issue",
                          "source": "heartex",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[SYM] \"It would be great if the coordinates in the saved XML were relative, so that resizing the Image doesn't require to adjust the coordinates of the bounding boxes\"",
                          "id": 9,
                          "lopLabel": "Feature Request",
                          "source": "labeling",
                          "type": "current"
                      },
                      {
                          "conflicts": 0,
                          "coverage": 0,
                          "lopFactor": "[SYM] \"Also it would be useful, if the paths were relative either to the Annotation or to a defineable location (like the project root directory of the developing project\"",
                          "id": 10,
                          "lopLabel": "Feature Request",
                          "source": "labeling",
                          "type": "current"
                      }
                  ]
      }),
    }).actions(self => ({
        setMode(mode) {
            self.mode = mode;
            keymaster.setScope(mode);
        },

        setSelectedCount(count) {
            self.selectedCount = count;
        },

        initHotkeys() {
            keymaster('l', 'label-table', function () {
                self.setMode('label-ops');
            });

            keymaster('shift+down', 'label-table', function () {
                self.taskStore.nextTask();
            });

            keymaster('shift+up', 'label-table', function () {
                self.taskStore.prevTask();
            });
            
            keymaster('t', 'label-ops', function () {
                self.setMode('label-table');
            });
        },

        afterCreate() {
            self.initHotkeys();
        }
    }));
