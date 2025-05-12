import { Fragment, ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';

// Utility function for combining class names
export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export interface HeaderProps {
  title?: string;
  dropdownItems?: {
    id: string;
    name: string;
    onClick?: () => void;
    isActive?: boolean;
  }[];
  dropdownTitle?: string;
  dropdownFooterContent?: ReactNode;
  onDropdownItemClick?: (itemId: string) => void;
  profileContent?: ReactNode;
  actionComponent?: ReactNode;
}

export function Header({
  title = 'Dashboard',
  dropdownItems = [],
  dropdownTitle = 'Select',
  dropdownFooterContent,
  onDropdownItemClick,
  profileContent,
  actionComponent,
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        
        <div className="flex items-center">
          {/* Dropdown menu */}
          {dropdownItems.length > 0 && (
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="flex rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  <span>{dropdownTitle}</span>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden">
                  {dropdownItems.map((item) => (
                    <Menu.Item key={item.id}>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            if (item.onClick) item.onClick();
                            if (onDropdownItemClick) onDropdownItemClick(item.id);
                          }}
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            item.isActive ? 'bg-gray-200' : '',
                            'w-full text-left block px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          {item.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  {dropdownFooterContent && (
                    <div className="border-t">{dropdownFooterContent}</div>
                  )}
                </Menu.Items>
              </Transition>
            </Menu>
          )}
          
          {/* Custom action component */}
          {actionComponent && (
            <div className="ml-4">{actionComponent}</div>
          )}
          
          {/* User profile placeholder */}
          {profileContent ? (
            <div className="ml-4 relative">{profileContent}</div>
          ) : (
            <div className="ml-4 relative">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                U
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
