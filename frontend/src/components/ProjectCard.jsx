import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { getImageUrl } from '../utils/api';

export default function ProjectCard({ project }) {
  const imageUrl = project.images && project.images[0] ? getImageUrl(project.images[0]) : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600';

  return (
    <Link to={`/project/${project.id}`} className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2" data-testid={`project-card-${project.id}`}>
      <div className="relative h-48 overflow-hidden">
        <img src={imageUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        {project.is_free && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">FREE</div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2" data-testid="project-name">{project.name}</h3>
        <p className="text-sm text-gray-600 mb-3" data-testid="project-tagline">{project.tagline}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.technologies.slice(0, 3).map((tech, idx) => (
            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{tech}</span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900" data-testid="project-price">
            {project.is_free ? 'Free' : `₹${project.price}`}
          </span>
          <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
            View Details
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
