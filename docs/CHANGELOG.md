# 0.4.1
- refactor reporting from Reporter, into
  - PercentReporter
  - GraphReporter
  - TagReporter
- more jsdocs
- split out avggraphsinone until it works
- add spinner, split into UI
- split BenchChain out of index into a file
- split Results into a class
- add more subscribing methods
- simplify some ops
- convert to more chainable store methods
- add configstore option

# 0.4.0
- fix async reporting some properties only being added to last cycle, just added to all now (bigger data but simpler code)
- auto-progress bars

# 0.3.0
- add name to suite
- add more fluent
- add docs for new stuff
- added percent calc, likely needs improvements
- more examples

# 0.2.0 🔋⏱⛓📊👾
- 🔋 battery parsing from plist when available
- 🔋 battery in benchmark recordings
- ⏱ microtime in recordings
- ⛓ extend chainable
- 📊 format microtime recordings
- 👾 simplify async benchmarks
- 🤸 split reports into another class
- 🔬 fix test folder name and add another super simple basic instantiation test
- 📈📉 more nice graphs
