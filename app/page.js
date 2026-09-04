{/* DYNAMIC CHART RENDERED HERE */}
              <div className="lg:col-span-2 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">My Progression</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['week', 'month', 'year', 'all-time'].map(f => (
                      <button key={f} onClick={() => setChartFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${chartFilter === f ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>
                        {f.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* WE NEED AT LEAST 2 POINTS TO DRAW A LINE */}
                {chartData.length > 1 ? (
                  <div className="w-full mt-4 relative">
                    {mounted && <ProgressionChart data={chartData} />}
                  </div>
                ) : chartData.length === 1 ? (
                   <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-white">
                    <span className="text-2xl mb-2">🏃</span>
                    <p className="text-sm font-medium text-black">First sprint logged!</p>
                    <p className="text-xs mt-1">Log one more sprint to see your progression line chart.</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-white">
                    <span className="text-2xl mb-2">🏁</span>
                    <p className="text-sm">Log some sprints to see your progress!</p>
                  </div>
                )}
              </div>
