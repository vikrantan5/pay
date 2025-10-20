import { useState, useEffect } from 'react';
import { Search, Code } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProjectCard from '../components/ProjectCard';
import { getProjects } from '../utils/api';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTech, setFilterTech] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, filterTech, projects]);

  const fetchProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.technologies.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filterTech !== 'all') {
      filtered = filtered.filter((p) => p.technologies.includes(filterTech));
    }
    setFilteredProjects(filtered);
  };

  const allTechnologies = [...new Set(projects.flatMap((p) => p.technologies))];

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navbar />
      <div className="relative overflow-hidden py-20 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto fade-in">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 p-4 rounded-2xl">
                <Code className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">Premium Project Source Codes</h1>
            <p className="text-base text-gray-600 mb-8">Build faster with professionally crafted project templates. Download source code instantly.</p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base" data-testid="search-input" />
          </div>
          <select value={filterTech} onChange={(e) => setFilterTech(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="filter-tech">
            <option value="all">All Technologies</option>
            {allTechnologies.map((tech) => (<option key={tech} value={tech}>{tech}</option>))}
          </select>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md h-96 animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20"><p className="text-xl text-gray-500">No projects found.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="projects-grid">
            {filteredProjects.map((project) => (<ProjectCard key={project.id} project={project} />))}
          </div>
        )}
      </div>
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">© 2025 CodeStore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
